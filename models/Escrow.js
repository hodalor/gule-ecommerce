const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Escrow:
 *       type: object
 *       required:
 *         - order
 *         - buyer
 *         - amount
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated escrow ID
 *         escrowNumber:
 *           type: string
 *           description: Unique escrow reference number
 *         order:
 *           type: string
 *           description: Order ID reference
 *         buyer:
 *           type: string
 *           description: Buyer ID reference
 *         sellers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               seller:
 *                 type: string
 *               amount:
 *                 type: number
 *               commission:
 *                 type: number
 *               status:
 *                 type: string
 *         totalAmount:
 *           type: number
 *           description: Total amount held in escrow
 *         status:
 *           type: string
 *           enum: [held, released, refunded, disputed, cancelled]
 *         holdPeriod:
 *           type: number
 *           description: Hold period in days
 *         autoReleaseDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const escrowSchema = new mongoose.Schema({
  escrowNumber: {
    type: String,
    unique: true,
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required']
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer is required']
  },
  sellers: [{
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Seller amount cannot be negative']
    },
    commission: {
      type: Number,
      required: true,
      min: [0, 'Commission cannot be negative']
    },
    netAmount: {
      type: Number,
      required: true,
      min: [0, 'Net amount cannot be negative']
    },
    status: {
      type: String,
      enum: ['held', 'released', 'refunded', 'disputed'],
      default: 'held'
    },
    releaseDate: {
      type: Date,
      default: null
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sellers.releasedByModel'
    },
    releasedByModel: {
      type: String,
      enum: ['Admin', 'User', 'System']
    },
    releaseReason: {
      type: String,
      enum: ['buyer_confirmation', 'auto_release', 'admin_release', 'dispute_resolution'],
      trim: true
    },
    releaseNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Release notes cannot exceed 500 characters']
    }
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'ZMW',
    enum: ['ZMW', 'USD', 'EUR', 'GBP']
  },
  status: {
    type: String,
    enum: {
      values: ['held', 'partially_released', 'released', 'refunded', 'disputed', 'cancelled'],
      message: 'Invalid escrow status'
    },
    default: 'held'
  },
  holdPeriod: {
    type: Number,
    required: [true, 'Hold period is required'],
    min: [1, 'Hold period must be at least 1 day'],
    default: 7 // days
  },
  autoReleaseDate: {
    type: Date,
    required: true
  },
  // Payment gateway information
  paymentDetails: {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true
    },
    paymentGateway: {
      type: String,
      required: [true, 'Payment gateway is required'],
      enum: ['stripe', 'flutterwave', 'paypal']
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['card', 'mobile_money', 'bank_transfer']
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  // Dispute information
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputeReason: {
      type: String,
      enum: ['non_delivery', 'item_not_as_described', 'damaged_item', 'unauthorized_transaction', 'other'],
      trim: true
    },
    disputeDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'Dispute description cannot exceed 1000 characters']
    },
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'dispute.disputedByModel'
    },
    disputedByModel: {
      type: String,
      enum: ['User', 'Seller']
    },
    disputedAt: {
      type: Date
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolution: {
      decision: {
        type: String,
        enum: ['buyer_favor', 'seller_favor', 'partial_refund', 'no_action'],
        trim: true
      },
      amount: {
        type: Number,
        min: 0
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
      },
      resolvedAt: {
        type: Date
      }
    },
    evidence: [{
      type: {
        type: String,
        enum: ['image', 'document', 'video', 'text'],
        required: true
      },
      url: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true,
        maxlength: [500, 'Evidence description cannot exceed 500 characters']
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'dispute.evidence.uploadedByModel'
      },
      uploadedByModel: {
        type: String,
        enum: ['User', 'Seller', 'Admin']
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Release conditions and triggers
  releaseConditions: {
    requiresBuyerConfirmation: {
      type: Boolean,
      default: true
    },
    requiresDeliveryConfirmation: {
      type: Boolean,
      default: true
    },
    allowAutoRelease: {
      type: Boolean,
      default: true
    },
    customConditions: [{
      condition: {
        type: String,
        required: true,
        trim: true
      },
      met: {
        type: Boolean,
        default: false
      },
      metAt: {
        type: Date
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'releaseConditions.customConditions.verifiedByModel'
      },
      verifiedByModel: {
        type: String,
        enum: ['Admin', 'User', 'Seller', 'System']
      }
    }]
  },
  // Refund information
  refunds: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    refundMethod: {
      type: String,
      enum: ['original_payment', 'bank_transfer', 'mobile_money', 'store_credit'],
      default: 'original_payment'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      trim: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: {
      type: Date
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  // Activity log
  activityLog: [{
    action: {
      type: String,
      required: true,
      enum: [
        'created', 'held', 'released', 'refunded', 'disputed', 
        'dispute_resolved', 'cancelled', 'auto_released', 'manually_released'
      ]
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'activityLog.performedByModel'
    },
    performedByModel: {
      type: String,
      enum: ['Admin', 'User', 'Seller', 'System']
    },
    details: {
      type: String,
      trim: true,
      maxlength: [500, 'Activity details cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  // Fees and charges
  fees: {
    escrowFee: {
      type: Number,
      default: 0,
      min: 0
    },
    processingFee: {
      type: Number,
      default: 0,
      min: 0
    },
    disputeFee: {
      type: Number,
      default: 0,
      min: 0
    },
    refundFee: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Notifications and reminders
  notifications: {
    buyerNotified: {
      type: Boolean,
      default: false
    },
    sellersNotified: {
      type: Boolean,
      default: false
    },
    autoReleaseWarning: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date
      }
    },
    releaseReminders: [{
      sentAt: {
        type: Date,
        default: Date.now
      },
      type: {
        type: String,
        enum: ['24h_warning', '1h_warning', 'overdue'],
        required: true
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if escrow is overdue for release
escrowSchema.virtual('isOverdue').get(function() {
  return Date.now() > this.autoReleaseDate && this.status === 'held';
});

// Virtual for days remaining until auto-release
escrowSchema.virtual('daysUntilRelease').get(function() {
  if (this.status !== 'held') return 0;
  const msUntilRelease = this.autoReleaseDate - Date.now();
  return Math.max(0, Math.ceil(msUntilRelease / (1000 * 60 * 60 * 24)));
});

// Virtual for total fees
escrowSchema.virtual('totalFees').get(function() {
  return this.fees.escrowFee + this.fees.processingFee + this.fees.disputeFee + this.fees.refundFee;
});

// Virtual for net amount after fees
escrowSchema.virtual('netAmount').get(function() {
  return this.totalAmount - this.totalFees;
});

// Indexes for better query performance
escrowSchema.index({ order: 1 });
escrowSchema.index({ buyer: 1 });
escrowSchema.index({ 'sellers.seller': 1 });
escrowSchema.index({ status: 1 });
escrowSchema.index({ autoReleaseDate: 1 });
escrowSchema.index({ 'dispute.isDisputed': 1 });
escrowSchema.index({ createdAt: -1 });

// Pre-save middleware to generate escrow number and calculate auto-release date
escrowSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate unique escrow number
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.escrowNumber = `ESC-${timestamp}-${random}`;
    
    // Calculate auto-release date
    this.autoReleaseDate = new Date(Date.now() + (this.holdPeriod * 24 * 60 * 60 * 1000));
    
    // Add creation activity log
    this.activityLog.push({
      action: 'created',
      performedByModel: 'System',
      details: `Escrow created for order ${this.order}`,
      timestamp: new Date()
    });
  }
  
  // Calculate net amounts for sellers
  this.sellers.forEach(seller => {
    seller.netAmount = seller.amount - seller.commission;
  });
  
  next();
});

// Instance method to add activity log
escrowSchema.methods.addActivity = function(action, performedBy, performedByModel, details, metadata = {}) {
  this.activityLog.push({
    action,
    performedBy,
    performedByModel,
    details,
    metadata,
    timestamp: new Date()
  });
  return this.save();
};

// Instance method to release funds to seller
escrowSchema.methods.releaseFunds = function(sellerId, releasedBy, releasedByModel, reason, notes) {
  const seller = this.sellers.find(s => s.seller.toString() === sellerId.toString());
  if (!seller) {
    throw new Error('Seller not found in this escrow');
  }
  
  if (seller.status !== 'held') {
    throw new Error('Funds for this seller have already been processed');
  }
  
  seller.status = 'released';
  seller.releaseDate = new Date();
  seller.releasedBy = releasedBy;
  seller.releasedByModel = releasedByModel;
  seller.releaseReason = reason;
  seller.releaseNotes = notes;
  
  // Check if all sellers have been processed
  const allReleased = this.sellers.every(s => s.status === 'released');
  const anyRefunded = this.sellers.some(s => s.status === 'refunded');
  
  if (allReleased) {
    this.status = 'released';
  } else if (anyRefunded || this.sellers.some(s => s.status === 'released')) {
    this.status = 'partially_released';
  }
  
  // Add activity log
  this.addActivity(
    'released',
    releasedBy,
    releasedByModel,
    `Funds released to seller ${sellerId}`,
    { sellerId, amount: seller.netAmount, reason }
  );
  
  return this.save();
};

// Instance method to refund to buyer
escrowSchema.methods.refundToBuyer = function(amount, reason, refundMethod, processedBy) {
  const refund = {
    amount,
    reason,
    refundMethod,
    processedBy,
    requestedAt: new Date(),
    status: 'pending'
  };
  
  this.refunds.push(refund);
  
  // Update seller statuses if full refund
  if (amount === this.totalAmount) {
    this.sellers.forEach(seller => {
      if (seller.status === 'held') {
        seller.status = 'refunded';
        seller.releaseDate = new Date();
        seller.releasedBy = processedBy;
        seller.releasedByModel = 'Admin';
        seller.releaseReason = 'refund';
        seller.releaseNotes = reason;
      }
    });
    this.status = 'refunded';
  }
  
  // Add activity log
  this.addActivity(
    'refunded',
    processedBy,
    'Admin',
    `Refund of ${amount} ${this.currency} initiated`,
    { amount, reason, refundMethod }
  );
  
  return this.save();
};

// Instance method to create dispute
escrowSchema.methods.createDispute = function(reason, description, disputedBy, disputedByModel, evidence = []) {
  this.dispute = {
    isDisputed: true,
    disputeReason: reason,
    disputeDescription: description,
    disputedBy,
    disputedByModel,
    disputedAt: new Date(),
    evidence
  };
  
  this.status = 'disputed';
  
  // Add activity log
  this.addActivity(
    'disputed',
    disputedBy,
    disputedByModel,
    `Dispute created: ${reason}`,
    { reason, description }
  );
  
  return this.save();
};

// Instance method to resolve dispute
escrowSchema.methods.resolveDispute = function(decision, amount, notes, resolvedBy) {
  if (!this.dispute.isDisputed) {
    throw new Error('No active dispute to resolve');
  }
  
  this.dispute.resolution = {
    decision,
    amount,
    notes,
    resolvedBy,
    resolvedAt: new Date()
  };
  
  // Update status based on resolution
  switch (decision) {
    case 'buyer_favor':
      this.status = 'refunded';
      this.refundToBuyer(amount || this.totalAmount, 'Dispute resolved in buyer favor', 'original_payment', resolvedBy);
      break;
    case 'seller_favor':
      this.sellers.forEach(seller => {
        if (seller.status === 'held') {
          this.releaseFunds(seller.seller, resolvedBy, 'Admin', 'dispute_resolution', 'Dispute resolved in seller favor');
        }
      });
      break;
    case 'partial_refund':
      this.refundToBuyer(amount, 'Partial refund due to dispute resolution', 'original_payment', resolvedBy);
      // Release remaining funds to sellers
      const remainingAmount = this.totalAmount - amount;
      this.sellers.forEach(seller => {
        if (seller.status === 'held') {
          const sellerPortion = (seller.amount / this.totalAmount) * remainingAmount;
          seller.amount = sellerPortion;
          seller.netAmount = sellerPortion - seller.commission;
          this.releaseFunds(seller.seller, resolvedBy, 'Admin', 'dispute_resolution', 'Partial release after dispute');
        }
      });
      break;
  }
  
  // Add activity log
  this.addActivity(
    'dispute_resolved',
    resolvedBy,
    'Admin',
    `Dispute resolved: ${decision}`,
    { decision, amount, notes }
  );
  
  return this.save();
};

// Static method to find overdue escrows for auto-release
escrowSchema.statics.findOverdueForRelease = function() {
  return this.find({
    status: 'held',
    autoReleaseDate: { $lte: new Date() },
    'releaseConditions.allowAutoRelease': true
  });
};

// Static method to find escrows needing release warnings
escrowSchema.statics.findNeedingWarnings = function() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.find({
    status: 'held',
    autoReleaseDate: { $lte: tomorrow },
    'notifications.autoReleaseWarning.sent': false
  });
};

// Static method to get escrow statistics
escrowSchema.statics.getStatistics = function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalEscrows: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        averageAmount: { $avg: '$totalAmount' },
        statusBreakdown: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        disputeRate: {
          $avg: { $cond: ['$dispute.isDisputed', 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Escrow', escrowSchema);