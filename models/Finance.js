const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['revenue', 'expense', 'commission', 'refund', 'payout', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['sales', 'marketing', 'operations', 'platform_fee', 'payment_processing', 'refunds', 'chargebacks', 'other'],
    required: true
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedSeller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet', 'cash', 'other']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  processedAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String
  }],
  isReconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: {
    type: Date
  },
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
financeSchema.index({ type: 1, createdAt: -1 });
financeSchema.index({ status: 1 });
financeSchema.index({ relatedOrder: 1 });
financeSchema.index({ relatedSeller: 1 });
// financeSchema.index({ transactionId: 1 });
financeSchema.index({ isReconciled: 1 });
financeSchema.index({ createdAt: -1 });

// Virtual for formatted amount
financeSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Static methods
financeSchema.statics.getRevenueByPeriod = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        type: 'revenue',
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

financeSchema.statics.getExpensesByCategory = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        type: 'expense',
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

financeSchema.statics.getFinancialSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
financeSchema.methods.markAsReconciled = function(adminId) {
  this.isReconciled = true;
  this.reconciledAt = new Date();
  this.reconciledBy = adminId;
  return this.save();
};

financeSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'completed') {
    this.processedAt = new Date();
  }
  return this.save();
};

// Pre-save middleware
financeSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    this.transactionId = `FIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

module.exports = mongoose.model('Finance', financeSchema);