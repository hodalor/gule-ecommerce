const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validateTransaction = [
  body('type').isIn([
    'payment', 'refund', 'payout', 'fee', 'commission', 'penalty', 
    'bonus', 'adjustment', 'chargeback', 'dispute_fee', 'withdrawal', 'deposit'
  ]).withMessage('Invalid transaction type'),
  body('category').isIn([
    'order_payment', 'seller_payout', 'platform_fee', 'payment_processing_fee',
    'shipping_fee', 'tax', 'refund_processing', 'chargeback_fee', 'dispute_resolution',
    'promotional_credit', 'loyalty_points', 'other'
  ]).withMessage('Invalid transaction category'),
  body('amount.gross').isNumeric().withMessage('Gross amount must be a number'),
  body('amount.net').isNumeric().withMessage('Net amount must be a number'),
  body('amount.currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
];

const validateTransactionId = [
  param('id').isMongoId().withMessage('Invalid transaction ID')
];

const validateTransactionQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'disputed', 'reversed']),
  query('type').optional().isIn([
    'payment', 'refund', 'payout', 'fee', 'commission', 'penalty', 
    'bonus', 'adjustment', 'chargeback', 'dispute_fee', 'withdrawal', 'deposit'
  ])
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   GET /api/transactions
// @desc    Get transactions for authenticated user (or all for admin)
// @access  Private
router.get('/', authenticate, validateTransactionQuery, handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      currency = 'USD',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    // Non-admin users can only see their own transactions
    if (!req.user.role || !['admin', 'super_admin'].includes(req.user.role)) {
      filter.$or = [
        { userId: req.user.id },
        { sellerId: req.user.id }
      ];
    }

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (currency) filter['amount.currency'] = currency.toUpperCase();

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter['amount.gross'] = {};
      if (minAmount) filter['amount.gross'].$gte = parseFloat(minAmount);
      if (maxAmount) filter['amount.gross'].$lte = parseFloat(maxAmount);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('sellerId', 'businessName firstName lastName')
        .populate('orderId', 'orderNumber totalAmount')
        .populate('refundId', 'refundNumber amount')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction by ID
// @access  Private
router.get('/:id', authenticate, validateTransactionId, handleValidationErrors, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    
    // Non-admin users can only see their own transactions
    if (!req.user.role || !['admin', 'super_admin'].includes(req.user.role)) {
      filter.$or = [
        { userId: req.user.id },
        { sellerId: req.user.id }
      ];
    }

    const transaction = await Transaction.findOne(filter)
      .populate('userId', 'firstName lastName email')
      .populate('sellerId', 'businessName firstName lastName')
      .populate('orderId', 'orderNumber totalAmount status')
      .populate('refundId', 'refundNumber amount status')
      .populate('parentTransaction', 'transactionId type amount')
      .populate('childTransactions', 'transactionId type amount status');

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
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction'
    });
  }
});

// @route   POST /api/transactions
// @desc    Create new transaction (Admin only)
// @access  Private (Admin)
router.post('/', authenticate, authorize(['admin', 'super_admin']), validateTransaction, handleValidationErrors, async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();

    await transaction.populate([
      { path: 'userId', select: 'firstName lastName email' },
      { path: 'sellerId', select: 'businessName firstName lastName' },
      { path: 'orderId', select: 'orderNumber totalAmount' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating transaction'
    });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction (Admin only)
// @access  Private (Admin)
router.put('/:id', authenticate, authorize(['admin', 'super_admin']), validateTransactionId, handleValidationErrors, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Prevent modification of completed transactions unless admin override
    if (transaction.status === 'completed' && !req.body.adminOverride) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify completed transaction without admin override'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'notes', 'metadata', 'reconciliation'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(transaction, updates);
    await transaction.save();

    await transaction.populate([
      { path: 'userId', select: 'firstName lastName email' },
      { path: 'sellerId', select: 'businessName firstName lastName' },
      { path: 'orderId', select: 'orderNumber totalAmount' }
    ]);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating transaction'
    });
  }
});

// @route   PATCH /api/transactions/:id/status
// @desc    Update transaction status
// @access  Private (Admin)
router.patch('/:id/status', authenticate, authorize(['admin', 'super_admin']), validateTransactionId, handleValidationErrors, async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!status || !['pending', 'processing', 'completed', 'failed', 'cancelled', 'disputed', 'reversed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const oldStatus = transaction.status;
    transaction.status = status;
    
    // Update timeline based on status
    const now = new Date();
    switch (status) {
      case 'processing':
        if (!transaction.timeline.processedAt) {
          transaction.timeline.processedAt = now;
        }
        break;
      case 'completed':
        if (!transaction.timeline.settledAt) {
          transaction.timeline.settledAt = now;
        }
        break;
      case 'failed':
      case 'cancelled':
        transaction.timeline.failedAt = now;
        break;
    }

    // Add status change to notes
    if (!transaction.notes) transaction.notes = '';
    transaction.notes += `\nStatus changed from ${oldStatus} to ${status} by ${req.user.email}`;
    if (reason) transaction.notes += ` - Reason: ${reason}`;
    transaction.notes += ` at ${now.toISOString()}`;

    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: {
        transactionId: transaction.transactionId,
        oldStatus,
        newStatus: status,
        updatedAt: now
      }
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating transaction status'
    });
  }
});

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction statistics
// @access  Private
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD' } = req.query;
    
    // Build filter
    const filter = { 'amount.currency': currency.toUpperCase() };
    
    // Non-admin users can only see their own transaction stats
    if (!req.user.role || !['admin', 'super_admin'].includes(req.user.role)) {
      filter.$or = [
        { userId: req.user.id },
        { sellerId: req.user.id }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount.gross' },
          totalFees: { $sum: '$amount.fee' },
          totalNet: { $sum: '$amount.net' },
          avgAmount: { $avg: '$amount.gross' },
          statusBreakdown: {
            $push: {
              status: '$status',
              amount: '$amount.gross'
            }
          },
          typeBreakdown: {
            $push: {
              type: '$type',
              amount: '$amount.gross'
            }
          }
        }
      }
    ]);

    let result = {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      totalNet: 0,
      avgAmount: 0,
      currency: currency.toUpperCase(),
      statusBreakdown: {},
      typeBreakdown: {}
    };

    if (stats.length > 0) {
      const data = stats[0];
      result.totalTransactions = data.totalTransactions;
      result.totalAmount = data.totalAmount;
      result.totalFees = data.totalFees;
      result.totalNet = data.totalNet;
      result.avgAmount = data.avgAmount;

      // Process status breakdown
      data.statusBreakdown.forEach(item => {
        if (!result.statusBreakdown[item.status]) {
          result.statusBreakdown[item.status] = { count: 0, amount: 0 };
        }
        result.statusBreakdown[item.status].count++;
        result.statusBreakdown[item.status].amount += item.amount;
      });

      // Process type breakdown
      data.typeBreakdown.forEach(item => {
        if (!result.typeBreakdown[item.type]) {
          result.typeBreakdown[item.type] = { count: 0, amount: 0 };
        }
        result.typeBreakdown[item.type].count++;
        result.typeBreakdown[item.type].amount += item.amount;
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction statistics'
    });
  }
});

// @route   POST /api/transactions/:id/reconcile
// @desc    Mark transaction as reconciled (Admin only)
// @access  Private (Admin)
router.post('/:id/reconcile', authenticate, authorize(['admin', 'super_admin']), validateTransactionId, handleValidationErrors, async (req, res) => {
  try {
    const { reconciledAmount, notes } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    transaction.reconciliation = {
      isReconciled: true,
      reconciledAt: new Date(),
      reconciledBy: req.user.id,
      reconciledAmount: reconciledAmount || transaction.amount.net,
      notes: notes || 'Reconciled by admin'
    };

    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction reconciled successfully',
      data: {
        transactionId: transaction.transactionId,
        reconciledAt: transaction.reconciliation.reconciledAt,
        reconciledAmount: transaction.reconciliation.reconciledAmount
      }
    });
  } catch (error) {
    console.error('Error reconciling transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reconciling transaction'
    });
  }
});

// @route   GET /api/transactions/export
// @desc    Export transactions to CSV (Admin only)
// @access  Private (Admin)
router.get('/export', authenticate, authorize(['admin', 'super_admin']), async (req, res) => {
  try {
    const { startDate, endDate, status, type, format = 'csv' } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('sellerId', 'businessName firstName lastName')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      const csvData = transactions.map(t => ({
        TransactionID: t.transactionId,
        Type: t.type,
        Category: t.category,
        Status: t.status,
        GrossAmount: t.amount.gross,
        NetAmount: t.amount.net,
        Fee: t.amount.fee,
        Currency: t.amount.currency,
        UserEmail: t.userId?.email || 'N/A',
        SellerName: t.sellerId?.businessName || `${t.sellerId?.firstName} ${t.sellerId?.lastName}` || 'N/A',
        OrderNumber: t.orderId?.orderNumber || 'N/A',
        CreatedAt: t.createdAt,
        UpdatedAt: t.updatedAt
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
      
      // Simple CSV conversion
      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: transactions,
        count: transactions.length
      });
    }
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting transactions'
    });
  }
});

module.exports = router;