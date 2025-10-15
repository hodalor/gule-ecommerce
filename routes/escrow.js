const express = require('express');
const router = express.Router();
const EscrowTransaction = require('../models/Escrow');
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireRole, authorizeUserType } = require('../middleware/auth');
const { 
  validateEscrow, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting for escrow operations
const escrowRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many escrow requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const releaseRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 release actions per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many release attempts, please try again later.',
    retryAfter: '1 hour'
  }
});

// Get user's escrow transactions
router.get('/my-transactions', 
  escrowRateLimit,
  authenticate,
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, sort = '-createdAt' } = req.query;

      let filter = {};
      
      // Filter based on user type
      if (req.user.userType === 'buyer') {
        filter.buyer = req.user.id;
      } else if (req.user.userType === 'seller') {
        filter.seller = req.user.id;
      } else {
        // Admin can see all transactions (no filter)
      }

      if (status) filter.status = status;
      if (type) filter.type = type;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const transactions = await EscrowTransaction.find(filter)
        .populate('order', 'orderNumber status total')
        .populate('buyer', 'firstName lastName email')
        .populate('seller', 'businessName email')
        .populate('releasedBy', 'firstName lastName email userType')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await EscrowTransaction.countDocuments(filter);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalTransactions: total,
            hasNext: skip + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching escrow transactions', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch escrow transactions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single escrow transaction
router.get('/:id', escrowRateLimit, authenticate, async (req, res) => {
  try {
    const transaction = await EscrowTransaction.findById(req.params.id)
      .populate('order', 'orderNumber status total items shippingAddress')
      .populate('buyer', 'firstName lastName email profilePicture')
      .populate('seller', 'businessName email profilePicture contactInfo')
      .populate('releasedBy', 'firstName lastName email userType')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Escrow transaction not found'
      });
    }

    // Check if user has access to this transaction
    const isBuyer = transaction.buyer._id.toString() === req.user.id;
    const isSeller = transaction.seller._id.toString() === req.user.id;
    const isAdmin = req.user.userType === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });

  } catch (error) {
    logger.error('Error fetching escrow transaction', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrow transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Hold payment in escrow (Internal use - called during order creation)
router.post('/hold', 
  escrowRateLimit,
  authenticate,
  authorizeUserType('buyer'),
  validateEscrow,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId, sellerId, amount, paymentReference } = req.body;

      // Verify order exists and belongs to buyer
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.buyer.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Verify seller exists
      const seller = await Seller.findById(sellerId);
      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      // Check if escrow transaction already exists
      const existingTransaction = await EscrowTransaction.findOne({
        order: orderId,
        seller: sellerId,
        buyer: req.user.id
      });

      if (existingTransaction) {
        return res.status(400).json({
          success: false,
          message: 'Escrow transaction already exists for this order and seller'
        });
      }

      // Create escrow transaction
      const escrowTransaction = new EscrowTransaction({
        order: orderId,
        buyer: req.user.id,
        seller: sellerId,
        amount,
        status: 'held',
        type: 'purchase',
        paymentReference,
        heldAt: new Date(),
        // Auto-release after 14 days if not manually released
        autoReleaseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      });

      await escrowTransaction.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'buyer',
        action: 'HOLD_ESCROW',
        resource: 'EscrowTransaction',
        resourceId: escrowTransaction._id,
        details: {
          orderId,
          sellerId,
          amount,
          paymentReference
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Payment held in escrow', {
        transactionId: escrowTransaction._id,
        orderId,
        buyerId: req.user.id,
        sellerId,
        amount
      });

      res.status(201).json({
        success: true,
        message: 'Payment held in escrow successfully',
        data: { transaction: escrowTransaction }
      });

    } catch (error) {
      logger.error('Error holding payment in escrow', error);
      res.status(500).json({
        success: false,
        message: 'Failed to hold payment in escrow',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Release payment from escrow (Buyers and Admins)
router.post('/:id/release', 
  releaseRateLimit,
  authenticate,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const transaction = await EscrowTransaction.findById(req.params.id)
        .populate('order', 'orderNumber status')
        .populate('buyer', 'firstName lastName')
        .populate('seller', 'businessName');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Escrow transaction not found'
        });
      }

      // Check permissions
      const isBuyer = transaction.buyer._id.toString() === req.user.id;
      const isAdmin = req.user.userType === 'admin';

      if (!isBuyer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the buyer or admin can release escrow payments'
        });
      }

      // Check if transaction can be released
      if (transaction.status !== 'held') {
        return res.status(400).json({
          success: false,
          message: `Cannot release escrow with status: ${transaction.status}`
        });
      }

      // Update transaction status
      transaction.status = 'released';
      transaction.releasedAt = new Date();
      transaction.releasedBy = req.user.id;
      transaction.releaseReason = reason;
      await transaction.save();

      // Update order status if all escrow transactions are released
      const orderEscrowTransactions = await EscrowTransaction.find({
        order: transaction.order._id
      });

      const allReleased = orderEscrowTransactions.every(t => 
        t.status === 'released' || t.status === 'cancelled'
      );

      if (allReleased && transaction.order.status === 'delivered') {
        await Order.findByIdAndUpdate(transaction.order._id, {
          status: 'completed',
          completedAt: new Date()
        });
      }

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: req.user.userType,
        action: 'RELEASE_ESCROW',
        resource: 'EscrowTransaction',
        resourceId: transaction._id,
        details: {
          orderId: transaction.order._id,
          orderNumber: transaction.order.orderNumber,
          sellerId: transaction.seller._id,
          amount: transaction.amount,
          reason,
          releasedBy: req.user.userType
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Escrow payment released', {
        transactionId: transaction._id,
        orderId: transaction.order._id,
        releasedBy: req.user.id,
        userType: req.user.userType,
        amount: transaction.amount
      });

      res.json({
        success: true,
        message: 'Escrow payment released successfully',
        data: { transaction }
      });

    } catch (error) {
      logger.error('Error releasing escrow payment', error);
      res.status(500).json({
        success: false,
        message: 'Failed to release escrow payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Dispute escrow transaction (Buyers and Sellers)
router.post('/:id/dispute', 
  escrowRateLimit,
  authenticate,
  async (req, res) => {
    try {
      const { reason, description } = req.body;
      const transaction = await EscrowTransaction.findById(req.params.id)
        .populate('order', 'orderNumber status')
        .populate('buyer', 'firstName lastName')
        .populate('seller', 'businessName');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Escrow transaction not found'
        });
      }

      // Check permissions
      const isBuyer = transaction.buyer._id.toString() === req.user.id;
      const isSeller = transaction.seller._id.toString() === req.user.id;

      if (!isBuyer && !isSeller) {
        return res.status(403).json({
          success: false,
          message: 'Only the buyer or seller can dispute this transaction'
        });
      }

      // Check if transaction can be disputed
      if (!['held', 'pending'].includes(transaction.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot dispute escrow with status: ${transaction.status}`
        });
      }

      // Update transaction status
      transaction.status = 'disputed';
      transaction.disputedAt = new Date();
      transaction.disputedBy = req.user.id;
      transaction.disputeReason = reason;
      transaction.disputeDescription = description;
      await transaction.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: req.user.userType,
        action: 'DISPUTE_ESCROW',
        resource: 'EscrowTransaction',
        resourceId: transaction._id,
        details: {
          orderId: transaction.order._id,
          orderNumber: transaction.order.orderNumber,
          reason,
          description,
          disputedBy: req.user.userType
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Escrow transaction disputed', {
        transactionId: transaction._id,
        orderId: transaction.order._id,
        disputedBy: req.user.id,
        userType: req.user.userType,
        reason
      });

      res.json({
        success: true,
        message: 'Escrow transaction disputed successfully. An admin will review this case.',
        data: { transaction }
      });

    } catch (error) {
      logger.error('Error disputing escrow transaction', error);
      res.status(500).json({
        success: false,
        message: 'Failed to dispute escrow transaction',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Resolve dispute (Admins only)
router.post('/:id/resolve-dispute', 
  escrowRateLimit,
  authenticate,
  authorizeUserType('admin'),
  async (req, res) => {
    try {
      const { resolution, refundToBuyer, releaseToSeller, adminNotes } = req.body;
      const transaction = await EscrowTransaction.findById(req.params.id)
        .populate('order', 'orderNumber')
        .populate('buyer', 'firstName lastName')
        .populate('seller', 'businessName');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Escrow transaction not found'
        });
      }

      if (transaction.status !== 'disputed') {
        return res.status(400).json({
          success: false,
          message: 'Transaction is not in disputed status'
        });
      }

      // Validate resolution parameters
      if (refundToBuyer && releaseToSeller) {
        return res.status(400).json({
          success: false,
          message: 'Cannot both refund to buyer and release to seller'
        });
      }

      if (!refundToBuyer && !releaseToSeller) {
        return res.status(400).json({
          success: false,
          message: 'Must specify either refund to buyer or release to seller'
        });
      }

      // Update transaction based on resolution
      if (refundToBuyer) {
        transaction.status = 'refunded';
        transaction.refundedAt = new Date();
      } else if (releaseToSeller) {
        transaction.status = 'released';
        transaction.releasedAt = new Date();
      }

      transaction.disputeResolvedAt = new Date();
      transaction.disputeResolvedBy = req.user.id;
      transaction.disputeResolution = resolution;
      transaction.adminNotes = adminNotes;
      await transaction.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'admin',
        action: 'RESOLVE_ESCROW_DISPUTE',
        resource: 'EscrowTransaction',
        resourceId: transaction._id,
        details: {
          orderId: transaction.order._id,
          orderNumber: transaction.order.orderNumber,
          resolution,
          refundToBuyer,
          releaseToSeller,
          adminNotes
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Escrow dispute resolved', {
        transactionId: transaction._id,
        orderId: transaction.order._id,
        resolvedBy: req.user.id,
        resolution,
        refundToBuyer,
        releaseToSeller
      });

      res.json({
        success: true,
        message: 'Escrow dispute resolved successfully',
        data: { transaction }
      });

    } catch (error) {
      logger.error('Error resolving escrow dispute', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve escrow dispute',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Auto-release expired escrow transactions (Cron job endpoint)
router.post('/auto-release', 
  authenticate,
  authorizeUserType('admin'),
  async (req, res) => {
    try {
      const now = new Date();
      
      // Find transactions eligible for auto-release
      const expiredTransactions = await EscrowTransaction.find({
        status: 'held',
        autoReleaseDate: { $lte: now }
      }).populate('order', 'orderNumber status');

      let releasedCount = 0;
      const results = [];

      for (const transaction of expiredTransactions) {
        try {
          // Only auto-release if order is delivered
          if (transaction.order.status === 'delivered') {
            transaction.status = 'released';
            transaction.releasedAt = new Date();
            transaction.releasedBy = req.user.id;
            transaction.releaseReason = 'Auto-released after expiration period';
            await transaction.save();

            releasedCount++;
            results.push({
              transactionId: transaction._id,
              orderId: transaction.order._id,
              amount: transaction.amount,
              status: 'released'
            });

            // Log audit trail
            await AuditLog.create({
              user: req.user.id,
              userType: 'admin',
              action: 'AUTO_RELEASE_ESCROW',
              resource: 'EscrowTransaction',
              resourceId: transaction._id,
              details: {
                orderId: transaction.order._id,
                orderNumber: transaction.order.orderNumber,
                amount: transaction.amount,
                autoReleaseDate: transaction.autoReleaseDate
              },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
        } catch (error) {
          logger.error('Error auto-releasing transaction', {
            transactionId: transaction._id,
            error: error.message
          });
          results.push({
            transactionId: transaction._id,
            orderId: transaction.order._id,
            status: 'error',
            error: error.message
          });
        }
      }

      logger.info('Auto-release process completed', {
        totalExpired: expiredTransactions.length,
        releasedCount,
        adminId: req.user.id
      });

      res.json({
        success: true,
        message: `Auto-release completed. ${releasedCount} transactions released.`,
        data: {
          totalExpired: expiredTransactions.length,
          releasedCount,
          results
        }
      });

    } catch (error) {
      logger.error('Error in auto-release process', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete auto-release process',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get escrow statistics
router.get('/stats/summary', escrowRateLimit, authenticate, async (req, res) => {
  try {
    let matchFilter = {};

    // Filter based on user type
    if (req.user.userType === 'buyer') {
      matchFilter.buyer = req.user.id;
    } else if (req.user.userType === 'seller') {
      matchFilter.seller = req.user.id;
    }
    // Admin can see all transactions (no filter)

    const stats = await EscrowTransaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          heldAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'held'] }, '$amount', 0] }
          },
          releasedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'released'] }, '$amount', 0] }
          },
          disputedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
          },
          refundedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      heldAmount: 0,
      releasedAmount: 0,
      disputedTransactions: 0,
      refundedAmount: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error fetching escrow statistics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrow statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;