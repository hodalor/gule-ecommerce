const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  reported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'hidden', 'deleted'],
    default: 'active'
  },
  sellerResponse: {
    comment: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ seller: 1, status: 1 });
reviewSchema.index({ buyer: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Virtual for average rating calculation
reviewSchema.virtual('isVerifiedPurchase').get(function() {
  return this.verified;
});

// Ensure one review per buyer per product
reviewSchema.index({ buyer: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);