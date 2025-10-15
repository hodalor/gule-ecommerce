const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     Seller:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - businessName
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated seller ID
 *         firstName:
 *           type: string
 *           description: Seller's first name
 *         lastName:
 *           type: string
 *           description: Seller's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Seller's email address
 *         businessName:
 *           type: string
 *           description: Name of the business
 *         businessType:
 *           type: string
 *           enum: [individual, company, partnership]
 *         businessRegistrationNumber:
 *           type: string
 *           description: Official business registration number
 *         taxNumber:
 *           type: string
 *           description: Tax identification number
 *         phone:
 *           type: string
 *           description: Seller's phone number
 *         businessAddress:
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
 *         bankDetails:
 *           type: object
 *           properties:
 *             bankName:
 *               type: string
 *             accountNumber:
 *               type: string
 *             accountName:
 *               type: string
 *             branchCode:
 *               type: string
 *         isVerified:
 *           type: boolean
 *           default: false
 *         verificationStatus:
 *           type: string
 *           enum: [pending, verified, rejected, suspended]
 *         isActive:
 *           type: boolean
 *           default: true
 *         rating:
 *           type: number
 *           default: 0
 *         totalSales:
 *           type: number
 *           default: 0
 *         commission:
 *           type: number
 *           default: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const sellerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: {
      values: ['individual', 'company', 'partnership'],
      message: 'Business type must be individual, company, or partnership'
    }
  },
  businessDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Business description cannot exceed 500 characters']
  },
  businessRegistrationNumber: {
    type: String,
    trim: true,
    sparse: true // Allows multiple null values but unique non-null values
  },
  taxNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty/null values or valid phone patterns
        if (!v) return true;
        return /^[+]?[0-9\s\-()]{7,15}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  businessAddress: {
    street: { 
      type: String, 
      trim: true 
    },
    city: { 
      type: String, 
      trim: true 
    },
    state: { 
      type: String, 
      trim: true 
    },
    zipCode: { 
      type: String, 
      trim: true 
    },
    country: { 
      type: String, 
      trim: true, 
      default: 'Zambia' 
    }
  },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountName: { type: String, trim: true },
    branchCode: { type: String, trim: true },
    swiftCode: { type: String, trim: true }
  },
  profileImage: {
    type: String,
    default: null
  },
  businessLogo: {
    type: String,
    default: null
  },
  documents: [{
    type: {
      type: String,
      enum: ['business_license', 'tax_certificate', 'id_document', 'bank_statement'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: {
      values: ['pending', 'verified', 'rejected', 'suspended'],
      message: 'Verification status must be pending, verified, rejected, or suspended'
    },
    default: 'pending'
  },
  verificationNotes: {
    type: String,
    trim: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'pending'],
      message: 'Status must be active, inactive, suspended, or pending'
    },
    default: 'active'
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalSales: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  commission: {
    type: Number,
    default: 5, // 5% default commission
    min: 0,
    max: 100
  },
  categories: [{
    type: String,
    trim: true
  }],
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    autoAcceptOrders: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'ny', 'bem']
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
sellerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for checking if account is locked
sellerSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for average rating display
sellerSchema.virtual('averageRating').get(function() {
  return this.totalReviews > 0 ? (this.rating / this.totalReviews).toFixed(1) : 0;
});

// Indexes for better query performance
sellerSchema.index({ businessName: 1 });
sellerSchema.index({ verificationStatus: 1 });
sellerSchema.index({ isActive: 1 });
sellerSchema.index({ rating: -1 });
sellerSchema.index({ totalSales: -1 });
sellerSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
sellerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    console.log('Hashing password in pre-save middleware:', this.password);
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed to:', this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
sellerSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
sellerSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
sellerSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to update rating
sellerSchema.methods.updateRating = function(newRating) {
  this.totalReviews += 1;
  this.rating = ((this.rating * (this.totalReviews - 1)) + newRating) / this.totalReviews;
  return this.save();
};

// Static method to find verified sellers
sellerSchema.statics.findVerified = function() {
  return this.find({ verificationStatus: 'verified', isActive: true });
};

// Static method to find by email
sellerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find top sellers
sellerSchema.statics.findTopSellers = function(limit = 10) {
  return this.find({ verificationStatus: 'verified', isActive: true })
    .sort({ totalSales: -1, rating: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Seller', sellerSchema);