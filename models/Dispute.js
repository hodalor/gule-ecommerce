const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  disputeId: {
    type: String,
    unique: true,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyerId: {
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
    enum: ['product_not_received', 'product_damaged', 'not_as_described', 'refund_request', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'escalated'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidence: [{
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'text']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    senderType: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      url: String,
      type: String,
      name: String
    }]
  }],
  resolution: {
    type: String,
    maxlength: 1000
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: Date,
  escalatedAt: Date,
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
disputeSchema.index({ disputeId: 1 });
disputeSchema.index({ orderId: 1 });
disputeSchema.index({ buyerId: 1 });
disputeSchema.index({ sellerId: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ priority: 1 });
disputeSchema.index({ createdAt: -1 });
disputeSchema.index({ assignedAdmin: 1 });

// Virtual for dispute age
disputeSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate dispute ID
disputeSchema.pre('save', async function(next) {
  if (!this.disputeId) {
    const count = await this.constructor.countDocuments();
    this.disputeId = `DSP-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Dispute', disputeSchema);