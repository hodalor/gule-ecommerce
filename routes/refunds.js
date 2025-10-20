const express = require('express');
const router = express.Router();
const Refund = require('../models/Refund');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting
const refundRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each user to 10 refund requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many refund requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Create refund request
router.post('/',
  refundRateLimit,
  authenticate,
  [
    body('orderId').isMongoId(),
    body('productId').optional().isMongoId(),
    body('type').isIn(['full', 'partial', 'shipping_only']),
    body('reason').isIn(['defective', 'not_as_described', 'damaged_in_shipping', 'wrong_item', 'changed_mind', 'duplicate_order', 'other']),
    body('description').isString().trim().isLength({ min: 10, max: 1000 }),
    body('requestedAmount').optional().isFloat({ min: 0 }),
    body('evidence').optional().isArray()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Verify order belongs to user
      const order = await Order.findOne({ 
        _id: req.body.orderId, 
        userId: req.user.id 
      }).populate('items.productId');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or access denied'
        });
      }

      // Check if order is eligible for refund
      if (!['delivered', 'completed'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order is not eligible for refund'
        });
      }

      // Check if refund already exists
      const existingRefund = await Refund.findOne({
        orderId: req.body.orderId,
        productId: req.body.productId || null,
        status: { $nin: ['rejected', 'cancelled'] }
      });

      if (existingRefund) {
        return res.status(400).json({
          success: false,
          message: 'Refund request already exists for this order/product'
        });
      }

      // Calculate refund amounts
      let maxRefundAmount = order.totalAmount;
      let productPrice = 0;

      if (req.body.productId) {
        const orderItem = order.items.find(item => 
          item.productId._id.toString() === req.body.productId
        );
        
        if (!orderItem) {
          return res.status(400).json({
            success: false,
            message: 'Product not found in order'
          });
        }
        
        productPrice = orderItem.price * orderItem.quantity;
        maxRefundAmount = productPrice;
      }

      const refundData = {
        ...req.body,
        userId: req.user.id,
        sellerId: order.sellerId,
        amounts: {
          requested: req.body.requestedAmount || maxRefundAmount,
          approved: 0,
          processed: 0,
          maximum: maxRefundAmount
        },
        currency: order.currency || 'USD',
        paymentMethod: order.paymentMethod
      };

      const refund = new Refund(refundData);
      await refund.save();

      await refund.populate([
        { path: 'userId', select: 'username email' },
        { path: 'sellerId', select: 'businessName email' },
        { path: 'orderId', select: 'orderNumber status totalAmount' },
        { path: 'productId', select: 'name images price' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Refund request submitted successfully',
        data: refund
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create refund request',
        error: error.message
      });
    }
  }
);

// Get user's refunds
router.get('/my-refunds',
  authenticate,
  [
    query('status').optional().isIn(['pending', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'cancelled']),
    query('type').optional().isIn(['full', 'partial', 'shipping_only']),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, sort = '-createdAt' } = req.query;
      const skip = (page - 1) * limit;

      const filter = { userId: req.user.id };
      if (status) filter.status = status;
      if (type) filter.type = type;

      const refunds = await Refund.find(filter)
        .populate([
          { path: 'orderId', select: 'orderNumber status totalAmount createdAt' },
          { path: 'productId', select: 'name images price' },
          { path: 'sellerId', select: 'businessName' }
        ])
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Refund.countDocuments(filter);

      res.json({
        success: true,
        data: {
          refunds,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch refunds',
        error: error.message
      });
    }
  }
);

// Get refund by ID
router.get('/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const refund = await Refund.findById(req.params.id)
        .populate([
          { path: 'userId', select: 'username email phone' },
          { path: 'sellerId', select: 'businessName email phone' },
          { path: 'orderId', select: 'orderNumber status totalAmount items createdAt' },
          { path: 'productId', select: 'name images price description' },
          { path: 'approvals.approvedBy', select: 'username email' }
        ]);

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found'
        });
      }

      // Check access permissions
      const canAccess = refund.userId._id.toString() === req.user.id || 
                       refund.sellerId._id.toString() === req.user.id ||
                       req.user.userType === 'admin';

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: refund
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch refund',
        error: error.message
      });
    }
  }
);

// Cancel refund request (User only, if pending)
router.patch('/:id/cancel',
  authenticate,
  [param('id').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const refund = await Refund.findOne({
        _id: req.params.id,
        userId: req.user.id,
        status: 'pending'
      });

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found or cannot be cancelled'
        });
      }

      refund.status = 'cancelled';
      refund.timestamps.cancelledAt = new Date();
      await refund.save();

      res.json({
        success: true,
        message: 'Refund request cancelled successfully',
        data: refund
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to cancel refund request',
        error: error.message
      });
    }
  }
);

// Admin/Seller routes for refund management
router.get('/admin/all',
  authenticate,
  authorizeUserType(['admin']),
  [
    query('status').optional().isIn(['pending', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'cancelled']),
    query('type').optional().isIn(['full', 'partial', 'shipping_only']),
    query('sellerId').optional().isMongoId(),
    query('search').optional().isString().trim(),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, sellerId, search, sort = '-createdAt' } = req.query;
      const skip = (page - 1) * limit;

      const filter = {};
      if (status) filter.status = status;
      if (type) filter.type = type;
      if (sellerId) filter.sellerId = sellerId;

      if (search) {
        filter.$or = [
          { refundId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const refunds = await Refund.find(filter)
        .populate([
          { path: 'userId', select: 'username email' },
          { path: 'sellerId', select: 'businessName email' },
          { path: 'orderId', select: 'orderNumber status totalAmount' },
          { path: 'productId', select: 'name images price' }
        ])
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Refund.countDocuments(filter);

      res.json({
        success: true,
        data: {
          refunds,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch refunds',
        error: error.message
      });
    }
  }
);

// Approve/Reject refund (Admin only)
router.patch('/:id/review',
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId(),
    body('action').isIn(['approve', 'reject']),
    body('approvedAmount').optional().isFloat({ min: 0 }),
    body('adminNotes').optional().isString().trim().isLength({ max: 1000 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { action, approvedAmount, adminNotes } = req.body;

      const refund = await Refund.findById(req.params.id);

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found'
        });
      }

      if (!['pending', 'under_review'].includes(refund.status)) {
        return res.status(400).json({
          success: false,
          message: 'Refund cannot be reviewed in current status'
        });
      }

      if (action === 'approve') {
        refund.status = 'approved';
        refund.amounts.approved = approvedAmount || refund.amounts.requested;
        refund.timestamps.approvedAt = new Date();
        
        refund.approvals.push({
          level: 'admin',
          approvedBy: req.user.id,
          approvedAmount: refund.amounts.approved,
          notes: adminNotes
        });
      } else {
        refund.status = 'rejected';
        refund.timestamps.rejectedAt = new Date();
      }

      if (adminNotes) {
        refund.adminNotes = adminNotes;
      }

      await refund.save();

      await refund.populate([
        { path: 'userId', select: 'username email' },
        { path: 'sellerId', select: 'businessName email' },
        { path: 'orderId', select: 'orderNumber' }
      ]);

      res.json({
        success: true,
        message: `Refund ${action}d successfully`,
        data: refund
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to review refund',
        error: error.message
      });
    }
  }
);

// Process refund (Admin only)
router.patch('/:id/process',
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId(),
    body('transactionId').optional().isString()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const refund = await Refund.findById(req.params.id);

      if (!refund) {
        return res.status(404).json({
          success: false,
          message: 'Refund not found'
        });
      }

      if (refund.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Refund must be approved before processing'
        });
      }

      refund.status = 'processing';
      refund.timestamps.processingStartedAt = new Date();

      // Create transaction record
      const transaction = new Transaction({
        type: 'refund',
        category: 'refund_processing',
        orderId: refund.orderId,
        userId: refund.userId,
        sellerId: refund.sellerId,
        amount: {
          gross: refund.amounts.approved,
          net: refund.amounts.approved,
          currency: refund.currency
        },
        paymentMethod: refund.paymentMethod,
        description: `Refund for order ${refund.orderId}`,
        reference: {
          internal: refund.refundId,
          external: req.body.transactionId
        }
      });

      await transaction.save();
      
      refund.amounts.processed = refund.amounts.approved;
      refund.status = 'completed';
      refund.timestamps.completedAt = new Date();

      await refund.save();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: refund
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  }
);

// Get refund statistics (Admin only)
router.get('/admin/statistics',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Refund.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            totalRequested: { $sum: '$amounts.requested' },
            totalApproved: { $sum: '$amounts.approved' },
            totalProcessed: { $sum: '$amounts.processed' }
          }
        }
      ]);

      const reasonStats = await Refund.aggregate([
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amounts.requested' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {},
          byReason: reasonStats
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch refund statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;