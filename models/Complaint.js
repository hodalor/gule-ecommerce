const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['service', 'product', 'delivery', 'payment', 'technical', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['billing', 'shipping', 'quality', 'customer_service', 'website_issue', 'account_issue', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['submitted', 'acknowledged', 'in_progress', 'resolved', 'closed'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  attachments: [{
    url: String,
    type: String,
    name: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  responses: [{
    responderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
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
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolution: {
    type: String,
    maxlength: 1000
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  resolvedAt: Date,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  tags: [String],
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'email', 'phone', 'chat'],
      default: 'web'
    },
    referenceNumber: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
complaintSchema.index({ complaintId: 1 });
complaintSchema.index({ userId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ type: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ assignedTo: 1 });

// Virtual for complaint age
complaintSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Pre-save middleware to generate complaint ID
complaintSchema.pre('save', async function(next) {
  if (!this.complaintId) {
    const count = await this.constructor.countDocuments();
    this.complaintId = `CMP-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);