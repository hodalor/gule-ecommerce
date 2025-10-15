const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       required:
 *         - buyer
 *         - items
 *         - totalAmount
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated order ID
 *         orderNumber:
 *           type: string
 *           description: Unique order number
 *         buyer:
 *           type: string
 *           description: Buyer ID reference
 *         buyerRef:
 *           type: string
 *           description: Anonymous buyer reference for privacy
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         totalAmount:
 *           type: number
 *           description: Total order amount
 *         status:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed, refunded, partially_refunded]
 *         shippingAddress:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer is required']
  },
  buyerRef: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderItem',
    required: true
  }],
  sellers: [{
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },
    items: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem'
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    commission: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    trackingNumber: {
      type: String,
      trim: true
    },
    shippedAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    }
  }],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
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
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      message: 'Invalid order status'
    },
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      message: 'Invalid payment status'
    },
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'mobile_money', 'bank_transfer', 'cash_on_delivery'],
    required: [true, 'Payment method is required']
  },
  paymentDetails: {
    transactionId: {
      type: String,
      trim: true
    },
    paymentGateway: {
      type: String,
      enum: ['stripe', 'flutterwave', 'paypal'],
      trim: true
    },
    mobileMoneyNumber: {
      type: String,
      trim: true
    },
    bankReference: {
      type: String,
      trim: true
    }
  },
  shippingAddress: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State/Province is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP/Postal code is required'],
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'Zambia'
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Delivery instructions cannot exceed 500 characters']
    }
  },
  billingAddress: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Zambia' }
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Order notes cannot exceed 1000 characters']
  },
  internalNotes: [{
    note: {
      type: String,
      required: true,
      trim: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'internalNotes.addedByModel',
      required: true
    },
    addedByModel: {
      type: String,
      required: true,
      enum: ['Admin', 'Seller']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['Admin', 'Seller', 'User']
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  estimatedDelivery: {
    type: Date,
    default: null
  },
  actualDelivery: {
    type: Date,
    default: null
  },
  trackingNumbers: [{
    carrier: {
      type: String,
      required: true,
      trim: true
    },
    trackingNumber: {
      type: String,
      required: true,
      trim: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  escrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    default: null
  },
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
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processed'],
      default: 'pending'
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'refunds.requestedByModel',
      required: true
    },
    requestedByModel: {
      type: String,
      required: true,
      enum: ['User', 'Seller', 'Admin']
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
    transactionId: {
      type: String,
      trim: true
    }
  }],
  reviews: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Gift message cannot exceed 500 characters']
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'admin'],
    default: 'web'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full shipping address
orderSchema.virtual('fullShippingAddress').get(function() {
  const addr = this.shippingAddress;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

// Virtual for order age in days
orderSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for checking if order is overdue
orderSchema.virtual('isOverdue').get(function() {
  if (!this.estimatedDelivery) return false;
  return Date.now() > this.estimatedDelivery && !this.actualDelivery;
});

// Indexes for better query performance
orderSchema.index({ buyer: 1 });
orderSchema.index({ 'sellers.seller': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ totalAmount: -1 });

// Pre-save middleware to generate order number and buyer reference
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
    
    // Generate anonymous buyer reference
    this.buyerRef = `BUY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    // Add initial status to history
    this.statusHistory.push({
      status: this.status,
      updatedAt: new Date()
    });
  }
  
  // Update status history when status changes
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      updatedAt: new Date()
    });
  }
  
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate total from subtotal, tax, shipping, and discount
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingCost - this.discountAmount;
  next();
});

// Instance method to add internal note
orderSchema.methods.addInternalNote = function(note, addedBy, addedByModel) {
  this.internalNotes.push({
    note,
    addedBy,
    addedByModel,
    addedAt: new Date()
  });
  return this.save();
};

// Instance method to update status
orderSchema.methods.updateStatus = function(newStatus, updatedBy, updatedByModel, notes) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    updatedBy,
    updatedByModel,
    updatedAt: new Date(),
    notes
  });
  
  // Set delivery date if status is delivered
  if (newStatus === 'delivered' && !this.actualDelivery) {
    this.actualDelivery = new Date();
  }
  
  return this.save();
};

// Instance method to add tracking number
orderSchema.methods.addTrackingNumber = function(carrier, trackingNumber, seller) {
  this.trackingNumbers.push({
    carrier,
    trackingNumber,
    seller,
    addedAt: new Date()
  });
  return this.save();
};

// Instance method to request refund
orderSchema.methods.requestRefund = function(amount, reason, requestedBy, requestedByModel) {
  this.refunds.push({
    amount,
    reason,
    requestedBy,
    requestedByModel,
    status: 'pending',
    requestedAt: new Date()
  });
  return this.save();
};

// Instance method to get filtered data for seller (privacy protection)
orderSchema.methods.getSellerView = function(sellerId, shareContactInfo = false) {
  const sellerData = this.sellers.find(s => s.seller.toString() === sellerId.toString());
  if (!sellerData) return null;
  
  const orderData = {
    _id: this._id,
    orderNumber: this.orderNumber,
    buyerRef: this.buyerRef,
    items: sellerData.items,
    subtotal: sellerData.subtotal,
    commission: sellerData.commission,
    status: sellerData.status,
    paymentStatus: this.paymentStatus,
    trackingNumber: sellerData.trackingNumber,
    shippedAt: sellerData.shippedAt,
    deliveredAt: sellerData.deliveredAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    estimatedDelivery: this.estimatedDelivery,
    notes: this.notes
  };
  
  // Include contact info only if admin settings allow
  if (shareContactInfo) {
    orderData.shippingAddress = this.shippingAddress;
    orderData.buyer = this.buyer;
  } else {
    // Provide minimal shipping info without personal details
    orderData.shippingAddress = {
      city: this.shippingAddress.city,
      state: this.shippingAddress.state,
      country: this.shippingAddress.country,
      instructions: this.shippingAddress.instructions
    };
  }
  
  return orderData;
};

// Static method to find orders by buyer
orderSchema.statics.findByBuyer = function(buyerId) {
  return this.find({ buyer: buyerId }).sort({ createdAt: -1 });
};

// Static method to find orders by seller
orderSchema.statics.findBySeller = function(sellerId) {
  return this.find({ 'sellers.seller': sellerId }).sort({ createdAt: -1 });
};

// Static method to find pending orders
orderSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

// Static method to get order statistics
orderSchema.statics.getStatistics = function(startDate, endDate) {
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
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
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

module.exports = mongoose.model('Order', orderSchema);