const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  userType: {
    type: String,
    enum: ['user', 'seller', 'admin', 'guest'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    version: String
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'terminated', 'suspicious'],
    default: 'active'
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  logoutTime: Date,
  expiresAt: {
    type: Date,
    required: true
  },
  activities: [{
    action: {
      type: String,
      enum: ['login', 'logout', 'page_view', 'api_call', 'purchase', 'search', 'profile_update', 'password_change'],
      required: true
    },
    endpoint: String,
    method: String,
    statusCode: Number,
    duration: Number, // in milliseconds
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  securityFlags: {
    isSecure: {
      type: Boolean,
      default: false
    },
    isSuspicious: {
      type: Boolean,
      default: false
    },
    multipleDevices: {
      type: Boolean,
      default: false
    },
    unusualLocation: {
      type: Boolean,
      default: false
    },
    rapidRequests: {
      type: Boolean,
      default: false
    }
  },
  tokens: {
    accessToken: String,
    refreshToken: String,
    csrfToken: String
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  analytics: {
    pageViews: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0 // in seconds
    },
    actionsPerformed: {
      type: Number,
      default: 0
    },
    bounceRate: Number,
    conversionEvents: [{
      event: String,
      timestamp: Date,
      value: Number
    }]
  },
  metadata: {
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    fingerprint: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ sellerId: 1 });
sessionSchema.index({ adminId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastActivity: 1 });
sessionSchema.index({ ipAddress: 1 });
sessionSchema.index({ 'securityFlags.isSuspicious': 1 });

// TTL index for automatic cleanup of expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for session duration
sessionSchema.virtual('duration').get(function() {
  const endTime = this.logoutTime || this.lastActivity || Date.now();
  return Math.floor((endTime - this.loginTime) / 1000); // in seconds
});

// Virtual for active status
sessionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.expiresAt > Date.now();
});

// Pre-save middleware
sessionSchema.pre('save', function(next) {
  // Update last activity
  if (this.isModified('activities')) {
    this.lastActivity = Date.now();
  }
  
  // Update analytics
  if (this.isModified('activities')) {
    this.analytics.actionsPerformed = this.activities.length;
    this.analytics.timeSpent = this.duration;
  }
  
  next();
});

// Method to add activity
sessionSchema.methods.addActivity = function(action, details = {}) {
  this.activities.push({
    action,
    ...details,
    timestamp: new Date()
  });
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to terminate session
sessionSchema.methods.terminate = function(reason = 'user_logout') {
  this.status = 'terminated';
  this.logoutTime = new Date();
  this.addActivity('logout', { reason });
  return this.save();
};

// Method to check if session is expired
sessionSchema.methods.isExpired = function() {
  return this.expiresAt < Date.now();
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    ]
  });
};

module.exports = mongoose.model('Session', sessionSchema);