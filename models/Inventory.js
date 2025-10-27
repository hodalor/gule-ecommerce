const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  availableStock: {
    type: Number,
    min: 0
  },
  minimumStock: {
    type: Number,
    default: 5,
    min: 0
  },
  maximumStock: {
    type: Number,
    default: 1000,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 10,
    min: 0
  },
  reorderQuantity: {
    type: Number,
    default: 50,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  sellingPrice: {
    type: Number,
    min: 0
  },
  location: {
    warehouse: String,
    shelf: String,
    bin: String,
    zone: String
  },
  supplier: {
    name: String,
    contactInfo: String,
    leadTime: Number // in days
  },
  stockMovements: [{
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment', 'reserved', 'released'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      enum: ['purchase', 'sale', 'return', 'damage', 'theft', 'adjustment', 'reservation', 'release'],
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    reference: String,
    notes: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    balanceAfter: Number
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['low_stock', 'out_of_stock', 'overstock', 'reorder_needed'],
      required: true
    },
    message: String,
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    acknowledgedAt: Date,
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  lastRestocked: Date,
  lastSold: Date,
  turnoverRate: Number, // calculated field
  daysOfSupply: Number, // calculated field
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'backordered'],
    default: 'active'
  },
  trackingEnabled: {
    type: Boolean,
    default: true
  },
  batchTracking: {
    enabled: {
      type: Boolean,
      default: false
    },
    batches: [{
      batchNumber: String,
      quantity: Number,
      expiryDate: Date,
      receivedDate: Date,
      supplier: String
    }]
  },
  serialTracking: {
    enabled: {
      type: Boolean,
      default: false
    },
    serialNumbers: [{
      serialNumber: String,
      status: {
        type: String,
        enum: ['available', 'sold', 'reserved', 'damaged'],
        default: 'available'
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Removed duplicate index; unique path-level index on productId exists
// Removed duplicate index; unique path-level index on sku exists
inventorySchema.index({ sellerId: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ 'alerts.isActive': 1 });

// Virtual for available stock calculation
inventorySchema.virtual('calculatedAvailableStock').get(function() {
  return Math.max(0, this.currentStock - this.reservedStock);
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  const available = this.calculatedAvailableStock;
  if (available === 0) return 'out_of_stock';
  if (available <= this.minimumStock) return 'low_stock';
  if (available >= this.maximumStock) return 'overstock';
  return 'in_stock';
});

// Pre-save middleware
inventorySchema.pre('save', function(next) {
  this.availableStock = this.calculatedAvailableStock;
  
  // Update alerts based on stock levels
  const stockStatus = this.stockStatus;
  
  // Clear existing alerts
  this.alerts = this.alerts.filter(alert => !alert.isActive);
  
  // Add new alerts if needed
  if (stockStatus === 'out_of_stock') {
    this.alerts.push({
      type: 'out_of_stock',
      message: 'Product is out of stock',
      isActive: true
    });
  } else if (stockStatus === 'low_stock') {
    this.alerts.push({
      type: 'low_stock',
      message: `Stock is below minimum level (${this.minimumStock})`,
      isActive: true
    });
  } else if (stockStatus === 'overstock') {
    this.alerts.push({
      type: 'overstock',
      message: `Stock exceeds maximum level (${this.maximumStock})`,
      isActive: true
    });
  }
  
  if (this.availableStock <= this.reorderPoint) {
    this.alerts.push({
      type: 'reorder_needed',
      message: `Stock has reached reorder point (${this.reorderPoint})`,
      isActive: true
    });
  }
  
  next();
});

// Method to add stock movement
inventorySchema.methods.addStockMovement = function(type, quantity, reason, options = {}) {
  const movement = {
    type,
    quantity,
    reason,
    ...options,
    timestamp: new Date(),
    balanceAfter: type === 'in' ? this.currentStock + quantity : this.currentStock - quantity
  };
  
  this.stockMovements.push(movement);
  
  if (type === 'in') {
    this.currentStock += quantity;
    this.lastRestocked = new Date();
  } else if (type === 'out') {
    this.currentStock = Math.max(0, this.currentStock - quantity);
    this.lastSold = new Date();
  } else if (type === 'reserved') {
    this.reservedStock += quantity;
  } else if (type === 'released') {
    this.reservedStock = Math.max(0, this.reservedStock - quantity);
  }
  
  return this.save();
};

module.exports = mongoose.model('Inventory', inventorySchema);