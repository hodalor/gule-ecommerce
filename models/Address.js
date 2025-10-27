const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  addressId: {
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
    enum: ['home', 'office', 'billing', 'shipping', 'other'],
    required: true
  },
  label: {
    type: String,
    maxlength: 50
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  recipient: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    company: {
      type: String,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  address: {
    street1: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    street2: {
      type: String,
      trim: true,
      maxlength: 100
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      default: 'United States'
    },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 3,
      default: 'US'
    }
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  deliveryInstructions: {
    type: String,
    maxlength: 500
  },
  accessCodes: {
    building: String,
    gate: String,
    apartment: String
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['manual', 'api', 'user_confirmed']
    },
    verificationData: mongoose.Schema.Types.Mixed
  },
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    totalOrders: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    preferredDeliveryTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'anytime'],
      default: 'anytime'
    },
    allowWeekendDelivery: {
      type: Boolean,
      default: true
    },
    requireSignature: {
      type: Boolean,
      default: false
    },
    leaveAtDoor: {
      type: Boolean,
      default: false
    }
  },
  restrictions: {
    maxPackageSize: String,
    noDeliveryDays: [String],
    specialRequirements: [String]
  },
  metadata: {
    source: {
      type: String,
      enum: ['user_input', 'import', 'api', 'migration'],
      default: 'user_input'
    },
    ipAddress: String,
    userAgent: String,
    timezone: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  archivedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Removed duplicate index; unique path-level index on addressId exists
addressSchema.index({ userId: 1 });
addressSchema.index({ type: 1 });
addressSchema.index({ isDefault: 1 });
addressSchema.index({ isActive: 1 });
addressSchema.index({ 'address.postalCode': 1 });
addressSchema.index({ 'address.city': 1 });
addressSchema.index({ 'address.state': 1 });
addressSchema.index({ 'address.country': 1 });
addressSchema.index({ 'verification.isVerified': 1 });

// Compound indexes
addressSchema.index({ userId: 1, isDefault: 1 });
addressSchema.index({ userId: 1, type: 1 });
addressSchema.index({ userId: 1, isActive: 1 });

// Virtual for full name
addressSchema.virtual('recipient.fullName').get(function() {
  return `${this.recipient.firstName} ${this.recipient.lastName}`.trim();
});

// Virtual for formatted address
addressSchema.virtual('formattedAddress').get(function() {
  const addr = this.address;
  let formatted = addr.street1;
  if (addr.street2) formatted += `, ${addr.street2}`;
  formatted += `, ${addr.city}, ${addr.state} ${addr.postalCode}`;
  if (addr.country !== 'United States') formatted += `, ${addr.country}`;
  return formatted;
});

// Virtual for short address
addressSchema.virtual('shortAddress').get(function() {
  const addr = this.address;
  return `${addr.city}, ${addr.state} ${addr.postalCode}`;
});

// Virtual for display name
addressSchema.virtual('displayName').get(function() {
  if (this.label) return this.label;
  return `${this.type.charAt(0).toUpperCase() + this.type.slice(1)} Address`;
});

// Pre-save middleware
addressSchema.pre('save', async function(next) {
  // Generate addressId if not exists
  if (!this.addressId) {
    const count = await this.constructor.countDocuments({ userId: this.userId });
    this.addressId = `ADDR-${this.userId.toString().slice(-6)}-${(count + 1).toString().padStart(3, '0')}`;
  }
  
  // Ensure only one default address per user per type
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        userId: this.userId, 
        type: this.type, 
        _id: { $ne: this._id },
        isActive: true
      },
      { $set: { isDefault: false } }
    );
  }
  
  // Update coordinates if address changed
  if (this.isModified('address') && !this.coordinates.latitude) {
    // Here you could integrate with a geocoding service
    // For now, we'll leave it empty
  }
  
  next();
});

// Method to mark as used
addressSchema.methods.markAsUsed = function(orderAmount = 0) {
  this.usage.timesUsed += 1;
  this.usage.lastUsed = new Date();
  this.usage.totalOrders += 1;
  this.usage.totalAmount += orderAmount;
  return this.save();
};

// Method to verify address
addressSchema.methods.verify = function(method = 'manual', data = {}) {
  this.verification.isVerified = true;
  this.verification.verifiedAt = new Date();
  this.verification.verificationMethod = method;
  this.verification.verificationData = data;
  return this.save();
};

// Method to archive address
addressSchema.methods.archive = function() {
  this.isActive = false;
  this.archivedAt = new Date();
  if (this.isDefault) {
    this.isDefault = false;
  }
  return this.save();
};

// Static method to get user addresses
addressSchema.statics.getUserAddresses = function(userId, activeOnly = true) {
  const query = { userId };
  if (activeOnly) query.isActive = true;
  
  return this.find(query).sort({ isDefault: -1, updatedAt: -1 });
};

// Static method to get default address
addressSchema.statics.getDefaultAddress = function(userId, type = null) {
  const query = { userId, isDefault: true, isActive: true };
  if (type) query.type = type;
  
  return this.findOne(query);
};

// Static method to set default address
addressSchema.statics.setDefaultAddress = function(addressId, userId) {
  return this.findOneAndUpdate(
    { addressId, userId, isActive: true },
    { $set: { isDefault: true } },
    { new: true }
  ).then(address => {
    if (address) {
      // Remove default from other addresses of same type
      return this.updateMany(
        { 
          userId, 
          type: address.type, 
          _id: { $ne: address._id },
          isActive: true
        },
        { $set: { isDefault: false } }
      ).then(() => address);
    }
    return null;
  });
};

module.exports = mongoose.model('Address', addressSchema);