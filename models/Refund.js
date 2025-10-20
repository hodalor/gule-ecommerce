const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundId: {
    type: String,
    unique: true,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderItem'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['full_refund', 'partial_refund', 'return_refund', 'cancellation_refund'],
    required: true
  },
  reason: {
    type: String,
    enum: ['defective_product', 'wrong_item', 'not_as_described', 'damaged_shipping', 'customer_request', 'seller_error', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'pending_approval', 'approved', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'requested'
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  refundAmount: {
    type: Number,
    required: true,
    min: 0
  },
  processingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['original_payment', 'bank_transfer', 'wallet', 'store_credit'],
    default: 'original_payment'
  },
  description: {
    type: String,
    maxlength: 1000
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  evidence: [{
    type: {
      type: String,
      enum: ['image', 'document', 'video']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  processedAt: Date,
  completedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
  transactionId: String,
  escrowReleased: {
    type: Boolean,
    default: false
  },
  escrowReleaseDate: Date,
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
refundSchema.index({ refundId: 1 });
refundSchema.index({ orderId: 1 });
refundSchema.index({ userId: 1 });
refundSchema.index({ sellerId: 1 });
refundSchema.index({ status: 1 });
refundSchema.index({ type: 1 });
refundSchema.index({ createdAt: -1 });
refundSchema.index({ approvedBy: 1 });

// Virtual for processing time
refundSchema.virtual('processingTimeInDays').get(function() {
  if (this.completedAt) {
    return Math.floor((this.completedAt - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
refundSchema.pre('save', async function(next) {
  if (!this.refundId) {
    const count = await this.constructor.countDocuments();
    this.refundId = `REF-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Calculate final amount
  this.finalAmount = this.refundAmount - this.processingFee;
  
  next();
});

module.exports = mongoose.model('Refund', refundSchema);