const express = require('express');
const router = express.Router();
const Finance = require('../models/Finance');
const Order = require('../models/Order');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting
const financeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many finance requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Get financial transactions
router.get('/transactions',
  financeRateLimit,
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    query('type').optional().isIn(['sale', 'refund', 'payout', 'fee', 'commission', 'penalty', 'bonus']),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, type, status, startDate, endDate, sort = '-createdAt' } = req.query;
      const skip = (page - 1) * limit;

      let filter = {};

      // For sellers, only show their transactions
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      if (type) filter.type = type;
      if (status) filter.status = status;

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const transactions = await Finance.find(filter)
        .populate([
          { path: 'orderId', select: 'orderNumber totalAmount status' },
          { path: 'sellerId', select: 'businessName email' },
          { path: 'buyerId', select: 'username email' }
        ])
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Finance.countDocuments(filter);

      res.json({
        success: true,
        data: {
          transactions,
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
        message: 'Failed to fetch transactions',
        error: error.message
      });
    }
  }
);

// Get transaction by ID
router.get('/transactions/:id',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [param('id').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
    try {
      let filter = { _id: req.params.id };

      // For sellers, only show their transactions
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      const transaction = await Finance.findOne(filter)
        .populate([
          { path: 'orderId', select: 'orderNumber totalAmount status items' },
          { path: 'sellerId', select: 'businessName email' },
          { path: 'buyerId', select: 'username email' }
        ]);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction',
        error: error.message
      });
    }
  }
);

// Create financial transaction (usually automated)
router.post('/transactions',
  authenticate,
  authorizeUserType(['admin']),
  [
    body('type').isIn(['sale', 'refund', 'payout', 'fee', 'commission', 'penalty', 'bonus']),
    body('amount').isFloat({ min: 0 }),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
    body('orderId').optional().isMongoId(),
    body('sellerId').optional().isMongoId(),
    body('buyerId').optional().isMongoId(),
    body('description').isString().trim(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const transaction = new Finance(req.body);
      await transaction.save();

      await transaction.populate([
        { path: 'orderId', select: 'orderNumber totalAmount status' },
        { path: 'sellerId', select: 'businessName email' },
        { path: 'buyerId', select: 'username email' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create transaction',
        error: error.message
      });
    }
  }
);

// Update transaction status
router.patch('/transactions/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId(),
    body('status').isIn(['pending', 'completed', 'failed', 'cancelled']),
    body('notes').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const transaction = await Finance.findById(req.params.id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      transaction.status = req.body.status;
      if (req.body.notes) {
        transaction.notes = req.body.notes;
      }

      if (req.body.status === 'completed') {
        transaction.processedAt = new Date();
      }

      await transaction.save();

      res.json({
        success: true,
        message: 'Transaction status updated successfully',
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction status',
        error: error.message
      });
    }
  }
);

// Get seller balance and earnings
router.get('/balance',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  async (req, res) => {
    try {
      let sellerId = req.user.userType === 'seller' ? req.user.id : req.query.sellerId;

      if (!sellerId) {
        return res.status(400).json({
          success: false,
          message: 'Seller ID is required for admin users'
        });
      }

      const balance = await Finance.aggregate([
        { $match: { sellerId: sellerId } },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const earnings = await Finance.aggregate([
        { $match: { sellerId: sellerId, type: 'sale', status: 'completed' } },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$amount' },
            totalSales: { $sum: 1 }
          }
        }
      ]);

      const pendingPayouts = await Finance.aggregate([
        { $match: { sellerId: sellerId, type: 'payout', status: 'pending' } },
        {
          $group: {
            _id: null,
            pendingAmount: { $sum: '$amount' },
            pendingCount: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          balance: balance.reduce((acc, item) => {
            acc[item._id] = {
              amount: item.totalAmount,
              count: item.count
            };
            return acc;
          }, {}),
          earnings: earnings[0] || { totalEarnings: 0, totalSales: 0 },
          pendingPayouts: pendingPayouts[0] || { pendingAmount: 0, pendingCount: 0 }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch balance',
        error: error.message
      });
    }
  }
);

// Request payout
router.post('/payout/request',
  authenticate,
  authorizeUserType(['seller']),
  [
    body('amount').isFloat({ min: 1 }),
    body('paymentMethod').isIn(['bank_transfer', 'paypal', 'stripe']),
    body('accountDetails').isObject(),
    body('notes').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check available balance
      const availableBalance = await Finance.aggregate([
        {
          $match: {
            sellerId: req.user.id,
            type: 'sale',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$amount' }
          }
        }
      ]);

      const totalPaidOut = await Finance.aggregate([
        {
          $match: {
            sellerId: req.user.id,
            type: 'payout',
            status: { $in: ['completed', 'pending'] }
          }
        },
        {
          $group: {
            _id: null,
            totalPaidOut: { $sum: '$amount' }
          }
        }
      ]);

      const available = (availableBalance[0]?.totalEarnings || 0) - (totalPaidOut[0]?.totalPaidOut || 0);

      if (req.body.amount > available) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance for payout request',
          availableBalance: available
        });
      }

      const payout = new Finance({
        type: 'payout',
        amount: req.body.amount,
        sellerId: req.user.id,
        description: 'Payout request',
        status: 'pending',
        metadata: {
          paymentMethod: req.body.paymentMethod,
          accountDetails: req.body.accountDetails
        },
        notes: req.body.notes
      });

      await payout.save();

      res.status(201).json({
        success: true,
        message: 'Payout request submitted successfully',
        data: payout
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to request payout',
        error: error.message
      });
    }
  }
);

// Get payout requests (Admin)
router.get('/payouts',
  authenticate,
  authorizeUserType(['admin']),
  [
    query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']),
    query('sellerId').optional().isMongoId(),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, sellerId, sort = '-createdAt' } = req.query;
      const skip = (page - 1) * limit;

      let filter = { type: 'payout' };
      if (status) filter.status = status;
      if (sellerId) filter.sellerId = sellerId;

      const payouts = await Finance.find(filter)
        .populate('sellerId', 'businessName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Finance.countDocuments(filter);

      res.json({
        success: true,
        data: {
          payouts,
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
        message: 'Failed to fetch payouts',
        error: error.message
      });
    }
  }
);

// Process payout (Admin)
router.patch('/payouts/:id/process',
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId(),
    body('action').isIn(['approve', 'reject']),
    body('notes').optional().isString().trim(),
    body('transactionId').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const payout = await Finance.findOne({
        _id: req.params.id,
        type: 'payout'
      });

      if (!payout) {
        return res.status(404).json({
          success: false,
          message: 'Payout request not found'
        });
      }

      if (payout.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Payout has already been processed'
        });
      }

      if (req.body.action === 'approve') {
        payout.status = 'completed';
        payout.processedAt = new Date();
        if (req.body.transactionId) {
          payout.metadata.transactionId = req.body.transactionId;
        }
      } else {
        payout.status = 'failed';
      }

      if (req.body.notes) {
        payout.notes = req.body.notes;
      }

      await payout.save();

      res.json({
        success: true,
        message: `Payout ${req.body.action}d successfully`,
        data: payout
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to process payout',
        error: error.message
      });
    }
  }
);

// Get financial reports
router.get('/reports/overview',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { period = 'monthly', startDate, endDate } = req.query;
      
      let dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      let sellerFilter = {};
      if (req.user.userType === 'seller') {
        sellerFilter.sellerId = req.user.id;
      }

      const matchFilter = { ...dateFilter, ...sellerFilter };

      // Group by period
      let groupBy;
      switch (period) {
        case 'daily':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
          break;
        case 'weekly':
          groupBy = {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          };
          break;
        case 'monthly':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          };
          break;
        case 'yearly':
          groupBy = {
            year: { $year: '$createdAt' }
          };
          break;
      }

      const report = await Finance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              period: groupBy,
              type: '$type',
              status: '$status'
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.period',
            transactions: {
              $push: {
                type: '$_id.type',
                status: '$_id.status',
                totalAmount: '$totalAmount',
                count: '$count'
              }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$_id.type', 'sale'] }, { $eq: ['$_id.status', 'completed'] }] },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        },
        { $sort: { '_id': -1 } }
      ]);

      // Summary statistics
      const summary = await Finance.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            completedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
              }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          report,
          summary: summary.reduce((acc, item) => {
            acc[item._id] = {
              total: item.totalAmount,
              count: item.count,
              completed: item.completedAmount,
              pending: item.pendingAmount
            };
            return acc;
          }, {})
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate financial report',
        error: error.message
      });
    }
  }
);

// Get commission settings (Admin)
router.get('/commission/settings',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      // This would typically come from a settings collection
      // For now, return default commission structure
      const commissionSettings = {
        defaultRate: 0.05, // 5%
        categoryRates: {
          electronics: 0.03,
          clothing: 0.08,
          books: 0.15,
          home: 0.06
        },
        minimumCommission: 0.50,
        payoutThreshold: 100.00,
        payoutSchedule: 'weekly'
      };

      res.json({
        success: true,
        data: commissionSettings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch commission settings',
        error: error.message
      });
    }
  }
);

module.exports = router;