const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated admin ID
 *         employeeId:
 *           type: string
 *           description: Unique employee ID
 *         firstName:
 *           type: string
 *           description: Admin's first name
 *         lastName:
 *           type: string
 *           description: Admin's last name
 *         email:
 *           type: string
 *           format: email
 *           description: Admin's email address
 *         role:
 *           type: string
 *           enum: [super_admin, admin, accountant, review_officer]
 *         department:
 *           type: string
 *           description: Admin's department
 *         isActive:
 *           type: boolean
 *           default: true
 *         profileImage:
 *           type: string
 *           description: Profile image URL
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           description: Specific permissions granted
 *         lastLogin:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const adminSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
    required: true
  },
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
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['super_admin', 'admin', 'accountant', 'review_officer', 'customer_support', 'marketing_manager'],
      message: 'Invalid admin role'
    }
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: ['administration', 'finance', 'operations', 'customer_service', 'marketing', 'technical', 'legal'],
      message: 'Invalid department'
    }
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  address: {
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
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  // Role-based permissions
  permissions: [{
    module: {
      type: String,
      required: true,
      enum: [
        'users', 'sellers', 'products', 'orders', 'escrow', 'reviews', 
        'settings', 'reports', 'audit_logs', 'admins', 'disputes', 'refunds'
      ]
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'assign']
    }]
  }],
  // Employment details
  employment: {
    hireDate: {
      type: Date,
      required: [true, 'Hire date is required']
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative']
    },
    currency: {
      type: String,
      default: 'ZMW',
      enum: ['ZMW', 'USD', 'EUR', 'GBP']
    },
    contractType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern'],
      default: 'full_time'
    },
    probationPeriod: {
      type: Number,
      default: 90 // days
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    }
  },
  // Security settings
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      select: false
    },
    ipWhitelist: [{
      type: String,
      trim: true
    }]
  },
  // Activity tracking
  activity: {
    lastLogin: {
      type: Date,
      default: null
    },
    lastLoginIP: {
      type: String,
      trim: true
    },
    loginHistory: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      ipAddress: {
        type: String,
        trim: true
      },
      userAgent: {
        type: String,
        trim: true
      },
      success: {
        type: Boolean,
        default: true
      }
    }],
    sessionToken: {
      type: String,
      select: false
    },
    sessionExpires: {
      type: Date,
      select: false
    }
  },
  // Work assignments and responsibilities
  assignments: [{
    type: {
      type: String,
      enum: ['product_review', 'dispute_resolution', 'seller_verification', 'order_management'],
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Assignment notes cannot exceed 500 characters']
    }
  }],
  // Performance metrics
  performance: {
    tasksCompleted: {
      type: Number,
      default: 0
    },
    averageCompletionTime: {
      type: Number,
      default: 0 // in hours
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    lastReviewDate: {
      type: Date
    },
    reviewNotes: {
      type: String,
      trim: true
    }
  },
  // Status and availability
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  availability: {
    status: {
      type: String,
      enum: ['available', 'busy', 'away', 'offline'],
      default: 'offline'
    },
    workingHours: {
      start: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
      },
      end: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
      },
      timezone: {
        type: String,
        default: 'Africa/Lusaka'
      }
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  // Notification preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    },
    categories: [{
      type: String,
      enum: ['orders', 'disputes', 'reviews', 'system', 'security'],
      default: ['orders', 'disputes', 'reviews', 'system', 'security']
    }]
  },
  // Emergency contact
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  // Termination details (if applicable)
  termination: {
    isTerminated: {
      type: Boolean,
      default: false
    },
    terminationDate: {
      type: Date
    },
    reason: {
      type: String,
      trim: true
    },
    terminatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    exitNotes: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// Virtual for work ID display
adminSchema.virtual('workIdDisplay').get(function() {
  return `${this.employeeId} - ${this.fullName}`;
});

// Virtual for checking if password needs reset
adminSchema.virtual('needsPasswordReset').get(function() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return this.security.lastPasswordChange < threeMonthsAgo;
});

// Indexes for better query performance
adminSchema.index({ role: 1 });
adminSchema.index({ department: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ 'availability.status': 1 });
adminSchema.index({ createdAt: -1 });

// Pre-save middleware to generate employee ID and hash password
adminSchema.pre('save', async function(next) {
  // Generate employee ID for new admins
  if (this.isNew) {
    const year = new Date().getFullYear();
    const rolePrefix = this.role.toUpperCase().substr(0, 2);
    const deptPrefix = this.department.toUpperCase().substr(0, 2);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.employeeId = `${year}${rolePrefix}${deptPrefix}${random}`;
    
    // Set default permissions based on role
    this.permissions = this.getDefaultPermissions();
    
    // Set default working hours and days
    this.availability.workingHours = {
      start: '08:00',
      end: '17:00',
      timezone: 'Africa/Lusaka'
    };
    this.availability.workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }
  
  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      this.security.lastPasswordChange = new Date();
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Instance method to get default permissions based on role
adminSchema.methods.getDefaultPermissions = function() {
  const rolePermissions = {
    super_admin: [
      { module: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'sellers', actions: ['create', 'read', 'update', 'delete', 'approve', 'reject'] },
      { module: 'products', actions: ['create', 'read', 'update', 'delete', 'approve', 'reject'] },
      { module: 'orders', actions: ['create', 'read', 'update', 'delete', 'assign'] },
      { module: 'escrow', actions: ['read', 'update', 'approve', 'reject'] },
      { module: 'reviews', actions: ['read', 'update', 'assign'] },
      { module: 'settings', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'reports', actions: ['read'] },
      { module: 'audit_logs', actions: ['read'] },
      { module: 'admins', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'disputes', actions: ['read', 'update', 'assign'] },
      { module: 'refunds', actions: ['read', 'update', 'approve', 'reject'] }
    ],
    admin: [
      { module: 'users', actions: ['read', 'update'] },
      { module: 'sellers', actions: ['read', 'update', 'approve', 'reject'] },
      { module: 'products', actions: ['read', 'update', 'approve', 'reject'] },
      { module: 'orders', actions: ['read', 'update', 'assign'] },
      { module: 'escrow', actions: ['read', 'update'] },
      { module: 'reviews', actions: ['read', 'assign'] },
      { module: 'settings', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read'] },
      { module: 'disputes', actions: ['read', 'update'] },
      { module: 'refunds', actions: ['read', 'update'] }
    ],
    accountant: [
      { module: 'orders', actions: ['read'] },
      { module: 'escrow', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read'] },
      { module: 'refunds', actions: ['read', 'update', 'approve', 'reject'] }
    ],
    review_officer: [
      { module: 'products', actions: ['read', 'approve', 'reject'] },
      { module: 'sellers', actions: ['read', 'approve', 'reject'] },
      { module: 'reviews', actions: ['read', 'update'] }
    ],
    customer_support: [
      { module: 'users', actions: ['read', 'update'] },
      { module: 'orders', actions: ['read', 'update'] },
      { module: 'disputes', actions: ['read', 'update'] },
      { module: 'refunds', actions: ['read', 'update'] }
    ],
    marketing_manager: [
      { module: 'products', actions: ['read'] },
      { module: 'users', actions: ['read'] },
      { module: 'sellers', actions: ['read'] },
      { module: 'reports', actions: ['read'] }
    ]
  };
  
  return rolePermissions[this.role] || [];
};

// Instance method to check password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  if (this.security.lockUntil && this.security.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }
  
  const updates = { $inc: { 'security.loginAttempts': 1 } };
  
  if (this.security.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { 'security.lockUntil': Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 'security.loginAttempts': 1, 'security.lockUntil': 1 }
  });
};

// Instance method to log login
adminSchema.methods.logLogin = function(ipAddress, userAgent, success = true) {
  this.activity.loginHistory.push({
    timestamp: new Date(),
    ipAddress,
    userAgent,
    success
  });
  
  if (success) {
    this.activity.lastLogin = new Date();
    this.activity.lastLoginIP = ipAddress;
  }
  
  // Keep only last 50 login records
  if (this.activity.loginHistory.length > 50) {
    this.activity.loginHistory = this.activity.loginHistory.slice(-50);
  }
  
  return this.save();
};

// Instance method to check permission
adminSchema.methods.hasPermission = function(module, action) {
  if (this.role === 'super_admin') return true;
  
  const modulePermission = this.permissions.find(p => p.module === module);
  return modulePermission && modulePermission.actions.includes(action);
};

// Instance method to assign task
adminSchema.methods.assignTask = function(type, assignedBy, dueDate, priority, notes) {
  this.assignments.push({
    type,
    assignedBy,
    assignedAt: new Date(),
    dueDate,
    priority,
    notes,
    status: 'pending'
  });
  return this.save();
};

// Instance method to update availability
adminSchema.methods.updateAvailability = function(status) {
  this.availability.status = status;
  this.isOnline = status !== 'offline';
  return this.save();
};

// Static method to find by role
adminSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find available admins
adminSchema.statics.findAvailable = function(role = null) {
  const query = { 
    isActive: true, 
    'availability.status': { $in: ['available', 'busy'] }
  };
  
  if (role) query.role = role;
  
  return this.find(query);
};

// Static method to find by department
adminSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Static method to get admin statistics
adminSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalAdmins: { $sum: 1 },
        activeAdmins: { $sum: { $cond: ['$isActive', 1, 0] } },
        onlineAdmins: { $sum: { $cond: ['$isOnline', 1, 0] } },
        roleBreakdown: {
          $push: {
            role: '$role',
            count: 1
          }
        },
        departmentBreakdown: {
          $push: {
            department: '$department',
            count: 1
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Admin', adminSchema);