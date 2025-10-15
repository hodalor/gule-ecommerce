const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       required:
 *         - product
 *         - seller
 *         - quantity
 *         - price
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated order item ID
 *         product:
 *           type: string
 *           description: Product ID reference
 *         seller:
 *           type: string
 *           description: Seller ID reference
 *         productName:
 *           type: string
 *           description: Product name at time of order
 *         productImage:
 *           type: string
 *           description: Product image URL at time of order
 *         quantity:
 *           type: number
 *           description: Quantity ordered
 *         price:
 *           type: number
 *           description: Unit price at time of order
 *         totalPrice:
 *           type: number
 *           description: Total price for this item
 *         variant:
 *           type: object
 *           description: Selected product variant details
 *         status:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: [true, 'Seller is required']
  },
  // Store product details at time of order to preserve historical data
  productSnapshot: {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    sku: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    weight: {
      value: Number,
      unit: String
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: String
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  currency: {
    type: String,
    default: 'ZMW',
    enum: ['ZMW', 'USD', 'EUR', 'GBP']
  },
  // Selected variant information
  selectedVariant: {
    variantName: {
      type: String,
      trim: true
    },
    variantValue: {
      type: String,
      trim: true
    },
    variantPrice: {
      type: Number,
      min: 0
    },
    variantSku: {
      type: String,
      trim: true
    }
  },
  // Customization or personalization details
  customization: {
    text: {
      type: String,
      trim: true,
      maxlength: [500, 'Customization text cannot exceed 500 characters']
    },
    options: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: String,
        required: true,
        trim: true
      },
      additionalCost: {
        type: Number,
        default: 0,
        min: 0
      }
    }],
    instructions: {
      type: String,
      trim: true,
      maxlength: [1000, 'Customization instructions cannot exceed 1000 characters']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      message: 'Invalid order item status'
    },
    default: 'pending'
  },
  // Shipping information specific to this item
  shipping: {
    weight: {
      value: {
        type: Number,
        min: 0
      },
      unit: {
        type: String,
        enum: ['kg', 'g', 'lb', 'oz'],
        default: 'kg'
      }
    },
    dimensions: {
      length: {
        type: Number,
        min: 0
      },
      width: {
        type: Number,
        min: 0
      },
      height: {
        type: Number,
        min: 0
      },
      unit: {
        type: String,
        enum: ['cm', 'm', 'in', 'ft'],
        default: 'cm'
      }
    },
    shippingClass: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'digital'],
      default: 'standard'
    },
    requiresShipping: {
      type: Boolean,
      default: true
    }
  },
  // Digital product delivery information
  digitalDelivery: {
    isDigital: {
      type: Boolean,
      default: false
    },
    downloadLinks: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      url: {
        type: String,
        required: true
      },
      expiresAt: {
        type: Date
      },
      downloadCount: {
        type: Number,
        default: 0
      },
      maxDownloads: {
        type: Number,
        default: 5
      }
    }],
    licenseKey: {
      type: String,
      trim: true
    },
    deliveredAt: {
      type: Date
    }
  },
  // Pricing breakdown
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    variantPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    customizationPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Commission and fees
  commission: {
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  // Return and refund information
  returnInfo: {
    isReturnable: {
      type: Boolean,
      default: true
    },
    returnPeriod: {
      type: Number,
      default: 30 // days
    },
    returnReason: {
      type: String,
      trim: true
    },
    returnStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected', 'returned', 'refunded'],
      default: 'none'
    },
    returnRequestedAt: {
      type: Date
    },
    returnProcessedAt: {
      type: Date
    }
  },
  // Review information
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    },
    reviewedAt: {
      type: Date
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true
    }
  },
  // Tracking and fulfillment
  fulfillment: {
    trackingNumber: {
      type: String,
      trim: true
    },
    carrier: {
      type: String,
      trim: true
    },
    shippedAt: {
      type: Date
    },
    estimatedDelivery: {
      type: Date
    },
    actualDelivery: {
      type: Date
    },
    deliveryAttempts: {
      type: Number,
      default: 0
    }
  },
  // Notes and special instructions
  notes: {
    customerNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Customer notes cannot exceed 500 characters']
    },
    sellerNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Seller notes cannot exceed 500 characters']
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Admin notes cannot exceed 500 characters']
    }
  },
  // Timestamps for different stages
  timestamps: {
    confirmedAt: {
      type: Date
    },
    processingStartedAt: {
      type: Date
    },
    shippedAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    refundedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if item is digital
orderItemSchema.virtual('isDigital').get(function() {
  return this.digitalDelivery.isDigital || !this.shipping.requiresShipping;
});

// Virtual for checking if item is returnable
orderItemSchema.virtual('canReturn').get(function() {
  if (!this.returnInfo.isReturnable) return false;
  if (this.returnInfo.returnStatus !== 'none') return false;
  
  const returnDeadline = new Date(this.timestamps.deliveredAt);
  returnDeadline.setDate(returnDeadline.getDate() + this.returnInfo.returnPeriod);
  
  return Date.now() <= returnDeadline;
});

// Virtual for total weight
orderItemSchema.virtual('totalWeight').get(function() {
  if (!this.shipping.weight.value) return 0;
  return this.shipping.weight.value * this.quantity;
});

// Virtual for seller earnings (after commission)
orderItemSchema.virtual('sellerEarnings').get(function() {
  return this.totalPrice - this.commission.amount;
});

// Indexes for better query performance
orderItemSchema.index({ product: 1 });
orderItemSchema.index({ seller: 1 });
orderItemSchema.index({ status: 1 });
orderItemSchema.index({ 'fulfillment.trackingNumber': 1 });
orderItemSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals and commission
orderItemSchema.pre('save', function(next) {
  // Calculate total price
  const baseTotal = this.pricing.basePrice * this.quantity;
  const variantTotal = this.pricing.variantPrice * this.quantity;
  const customizationTotal = this.pricing.customizationPrice * this.quantity;
  
  this.totalPrice = baseTotal + variantTotal + customizationTotal - this.pricing.discountAmount + this.pricing.taxAmount;
  this.unitPrice = this.totalPrice / this.quantity;
  
  // Calculate commission amount
  this.commission.amount = (this.totalPrice * this.commission.rate) / 100;
  
  // Update timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        if (!this.timestamps.confirmedAt) this.timestamps.confirmedAt = now;
        break;
      case 'processing':
        if (!this.timestamps.processingStartedAt) this.timestamps.processingStartedAt = now;
        break;
      case 'shipped':
        if (!this.timestamps.shippedAt) this.timestamps.shippedAt = now;
        if (!this.fulfillment.shippedAt) this.fulfillment.shippedAt = now;
        break;
      case 'delivered':
        if (!this.timestamps.deliveredAt) this.timestamps.deliveredAt = now;
        if (!this.fulfillment.actualDelivery) this.fulfillment.actualDelivery = now;
        break;
      case 'cancelled':
        if (!this.timestamps.cancelledAt) this.timestamps.cancelledAt = now;
        break;
      case 'refunded':
        if (!this.timestamps.refundedAt) this.timestamps.refundedAt = now;
        break;
    }
  }
  
  next();
});

// Instance method to add review
orderItemSchema.methods.addReview = function(rating, comment) {
  this.review = {
    rating,
    comment,
    reviewedAt: new Date(),
    isVerifiedPurchase: true
  };
  return this.save();
};

// Instance method to request return
orderItemSchema.methods.requestReturn = function(reason) {
  if (!this.canReturn) {
    throw new Error('This item is not eligible for return');
  }
  
  this.returnInfo.returnReason = reason;
  this.returnInfo.returnStatus = 'requested';
  this.returnInfo.returnRequestedAt = new Date();
  
  return this.save();
};

// Instance method to update tracking
orderItemSchema.methods.updateTracking = function(trackingNumber, carrier) {
  this.fulfillment.trackingNumber = trackingNumber;
  this.fulfillment.carrier = carrier;
  
  if (this.status === 'confirmed' || this.status === 'processing') {
    this.status = 'shipped';
  }
  
  return this.save();
};

// Instance method to mark as delivered
orderItemSchema.methods.markDelivered = function() {
  this.status = 'delivered';
  this.fulfillment.actualDelivery = new Date();
  this.timestamps.deliveredAt = new Date();
  
  return this.save();
};

// Static method to find items by seller
orderItemSchema.statics.findBySeller = function(sellerId) {
  return this.find({ seller: sellerId }).sort({ createdAt: -1 });
};

// Static method to find items by product
orderItemSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId }).sort({ createdAt: -1 });
};

// Static method to get seller statistics
orderItemSchema.statics.getSellerStats = function(sellerId, startDate, endDate) {
  const matchStage = { seller: new mongoose.Types.ObjectId(sellerId) };
  
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
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalRevenue: { $sum: '$totalPrice' },
        totalCommission: { $sum: '$commission.amount' },
        totalEarnings: { $sum: { $subtract: ['$totalPrice', '$commission.amount'] } },
        averageOrderValue: { $avg: '$totalPrice' },
        statusBreakdown: {
          $push: {
            status: '$status',
            count: 1
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('OrderItem', orderItemSchema);