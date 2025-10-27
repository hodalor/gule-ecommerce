const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  refundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Refund'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  type: {
    type: String,
    enum: [
      'payment',
      'refund',
      'payout',
      'fee',
      'commission',
      'penalty',
      'bonus',
      'adjustment',
      'chargeback',
      'dispute_fee',
      'withdrawal',
      'deposit'
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'order_payment',
      'seller_payout',
      'platform_fee',
      'payment_processing_fee',
      'shipping_fee',
      'tax',
      'refund_processing',
      'chargeback_fee',
      'dispute_resolution',
      'promotional_credit',
      'loyalty_points',
      'other'
    ],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'disputed', 'reversed'],
    default: 'pending'
  },
  amount: {
    gross: {
      type: Number,
      required: true
    },
    net: {
      type: Number,
      required: true
    },
    fee: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true
    }
  },
  exchangeRate: {
    rate: Number,
    fromCurrency: String,
    toCurrency: String,
    provider: String,
    timestamp: Date
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'wallet', 'cash', 'crypto', 'other']
    },
    provider: String,
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number,
    fingerprint: String
  },
  gateway: {
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'square', 'razorpay', 'braintree', 'other']
    },
    transactionId: String,
    paymentIntentId: String,
    chargeId: String,
    sessionId: String,
    webhookId: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String,
    maxlength: 500
  },
  reference: {
    internal: String,
    external: String,
    invoice: String,
    receipt: String
  },
  parties: {
    payer: {
      id: mongoose.Schema.Types.ObjectId,
      type: {
        type: String,
        enum: ['User', 'Seller', 'Admin', 'System']
      },
      name: String,
      email: String
    },
    payee: {
      id: mongoose.Schema.Types.ObjectId,
      type: {
        type: String,
        enum: ['User', 'Seller', 'Admin', 'System']
      },
      name: String,
      email: String
    }
  },
  timeline: {
    initiatedAt: {
      type: Date,
      default: Date.now
    },
    authorizedAt: Date,
    capturedAt: Date,
    settledAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    disputedAt: Date,
    resolvedAt: Date
  },
  fees: [{
    type: {
      type: String,
      enum: ['platform_fee', 'payment_processing', 'currency_conversion', 'chargeback', 'dispute', 'other']
    },
    amount: Number,
    percentage: Number,
    description: String,
    recipient: {
      type: String,
      enum: ['platform', 'payment_processor', 'bank', 'other']
    }
  }],
  reconciliation: {
    isReconciled: {
      type: Boolean,
      default: false
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    bankStatementRef: String,
    discrepancy: {
      amount: Number,
      reason: String,
      resolved: Boolean
    }
  },
  risk: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    factors: [String],
    fraudulent: {
      type: Boolean,
      default: false
    },
    reviewRequired: {
      type: Boolean,
      default: false
    }
  },
  compliance: {
    amlChecked: {
      type: Boolean,
      default: false
    },
    kycRequired: {
      type: Boolean,
      default: false
    },
    taxReported: {
      type: Boolean,
      default: false
    },
    regulatoryFlags: [String]
  },
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    smsSent: {
      type: Boolean,
      default: false
    },
    pushSent: {
      type: Boolean,
      default: false
    },
    webhookSent: {
      type: Boolean,
      default: false
    }
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    sessionId: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin', 'system']
    },
    tags: [String],
    notes: String
  },
  parentTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  childTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  isTest: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Removed duplicate index; unique path-level index on transactionId exists
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ sellerId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'amount.currency': 1 });
transactionSchema.index({ 'gateway.provider': 1 });
transactionSchema.index({ 'gateway.transactionId': 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ 'timeline.settledAt': 1 });
transactionSchema.index({ 'reconciliation.isReconciled': 1 });
transactionSchema.index({ isTest: 1 });

// Compound indexes
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, createdAt: -1 });

// Virtual for net amount after fees
transactionSchema.virtual('finalAmount').get(function() {
  return this.amount.net - this.amount.fee - this.amount.tax;
});

// Virtual for processing time
transactionSchema.virtual('processingTime').get(function() {
  if (this.timeline.settledAt && this.timeline.initiatedAt) {
    return Math.floor((this.timeline.settledAt - this.timeline.initiatedAt) / 1000); // in seconds
  }
  return null;
});

// Virtual for is settled
transactionSchema.virtual('isSettled').get(function() {
  return this.status === 'completed' && this.timeline.settledAt;
});

// Pre-save middleware
transactionSchema.pre('save', async function(next) {
  // Generate transaction ID
  if (!this.transactionId) {
    const count = await this.constructor.countDocuments();
    const prefix = this.type.toUpperCase().substring(0, 3);
    this.transactionId = `${prefix}-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
  }
  
  // Calculate net amount if not provided
  if (this.isModified('amount') && !this.amount.net) {
    this.amount.net = this.amount.gross - this.amount.fee - this.amount.tax;
  }
  
  // Update timeline based on status
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'processing':
        if (!this.timeline.authorizedAt) this.timeline.authorizedAt = now;
        break;
      case 'completed':
        if (!this.timeline.capturedAt) this.timeline.capturedAt = now;
        if (!this.timeline.settledAt) this.timeline.settledAt = now;
        break;
      case 'failed':
        this.timeline.failedAt = now;
        break;
      case 'cancelled':
        this.timeline.cancelledAt = now;
        break;
      case 'disputed':
        this.timeline.disputedAt = now;
        break;
    }
  }
  
  next();
});

// Method to update status
transactionSchema.methods.updateStatus = function(newStatus, metadata = {}) {
  this.status = newStatus;
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

// Method to add fee
transactionSchema.methods.addFee = function(feeData) {
  this.fees.push(feeData);
  this.amount.fee += feeData.amount;
  this.amount.net = this.amount.gross - this.amount.fee - this.amount.tax;
  return this.save();
};

// Method to reconcile
transactionSchema.methods.reconcile = function(reconciledBy, bankRef, discrepancy = null) {
  this.reconciliation.isReconciled = true;
  this.reconciliation.reconciledAt = new Date();
  this.reconciliation.reconciledBy = reconciledBy;
  this.reconciliation.bankStatementRef = bankRef;
  
  if (discrepancy) {
    this.reconciliation.discrepancy = discrepancy;
  }
  
  return this.save();
};

// Static method to get transaction summary
transactionSchema.statics.getSummary = function(filters = {}, dateRange = {}) {
  const matchStage = { ...filters };
  
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.createdAt.$lte = new Date(dateRange.end);
  }
  
  return this.aggregate([
    { $match: matchStage },
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
        }
      }
    }
  ]);
};

// Static method to get revenue by period
transactionSchema.statics.getRevenueByPeriod = function(period = 'day', limit = 30) {
  const groupBy = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    week: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
  };
  
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - limit * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: groupBy[period],
        revenue: { $sum: '$amount.net' },
        transactions: { $sum: 1 },
        fees: { $sum: '$amount.fee' }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);