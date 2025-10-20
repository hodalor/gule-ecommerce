const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'general',
      'payment',
      'shipping',
      'email',
      'sms',
      'security',
      'api',
      'ui',
      'analytics',
      'maintenance',
      'notification',
      'tax',
      'currency',
      'localization',
      'social',
      'seo',
      'performance'
    ],
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  validation: {
    required: {
      type: Boolean,
      default: false
    },
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    enum: [String],
    custom: String // Custom validation function name
  },
  defaultValue: mongoose.Schema.Types.Mixed,
  environment: {
    type: String,
    enum: ['all', 'development', 'staging', 'production'],
    default: 'all'
  },
  scope: {
    type: String,
    enum: ['system', 'tenant', 'user'],
    default: 'system'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  tags: [String],
  metadata: {
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'metadata.lastModifiedByModel'
    },
    lastModifiedByModel: {
      type: String,
      enum: ['Admin', 'User', 'System']
    },
    version: {
      type: Number,
      default: 1
    },
    changeLog: [{
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'metadata.changeLog.changedByModel'
      },
      changedByModel: {
        type: String,
        enum: ['Admin', 'User', 'System']
      },
      reason: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    source: {
      type: String,
      enum: ['manual', 'import', 'api', 'migration', 'system'],
      default: 'manual'
    }
  },
  dependencies: [{
    key: String,
    condition: String, // e.g., 'equals', 'not_equals', 'greater_than'
    value: mongoose.Schema.Types.Mixed
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
settingSchema.index({ key: 1 });
settingSchema.index({ category: 1 });
settingSchema.index({ isPublic: 1 });
settingSchema.index({ environment: 1 });
settingSchema.index({ scope: 1 });
settingSchema.index({ isActive: 1 });
settingSchema.index({ priority: -1 });
settingSchema.index({ tags: 1 });

// TTL index for settings with expiration
settingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted value
settingSchema.virtual('formattedValue').get(function() {
  switch (this.type) {
    case 'boolean':
      return this.value ? 'Yes' : 'No';
    case 'number':
      return this.value.toLocaleString();
    case 'object':
    case 'array':
      return JSON.stringify(this.value, null, 2);
    default:
      return String(this.value);
  }
});

// Virtual for is expired
settingSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < Date.now();
});

// Pre-save middleware
settingSchema.pre('save', function(next) {
  // Validate value type
  if (this.isModified('value')) {
    const actualType = Array.isArray(this.value) ? 'array' : typeof this.value;
    if (actualType === 'object' && this.value === null) {
      return next(new Error('Value cannot be null'));
    }
    
    if (this.type !== actualType) {
      return next(new Error(`Value type mismatch. Expected ${this.type}, got ${actualType}`));
    }
    
    // Add to change log
    if (!this.isNew) {
      this.metadata.changeLog.push({
        oldValue: this._original?.value,
        newValue: this.value,
        timestamp: new Date()
      });
      this.metadata.version += 1;
    }
  }
  
  next();
});

// Post-init middleware to store original value
settingSchema.post('init', function() {
  this._original = this.toObject();
});

// Method to validate value
settingSchema.methods.validateValue = function(value) {
  const validation = this.validation;
  
  if (validation.required && (value === null || value === undefined || value === '')) {
    throw new Error('Value is required');
  }
  
  if (validation.min !== undefined && value < validation.min) {
    throw new Error(`Value must be at least ${validation.min}`);
  }
  
  if (validation.max !== undefined && value > validation.max) {
    throw new Error(`Value must be at most ${validation.max}`);
  }
  
  if (validation.minLength !== undefined && String(value).length < validation.minLength) {
    throw new Error(`Value must be at least ${validation.minLength} characters long`);
  }
  
  if (validation.maxLength !== undefined && String(value).length > validation.maxLength) {
    throw new Error(`Value must be at most ${validation.maxLength} characters long`);
  }
  
  if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
    throw new Error('Value does not match required pattern');
  }
  
  if (validation.enum && validation.enum.length > 0 && !validation.enum.includes(value)) {
    throw new Error(`Value must be one of: ${validation.enum.join(', ')}`);
  }
  
  return true;
};

// Method to update value
settingSchema.methods.updateValue = function(newValue, updatedBy, reason) {
  this.validateValue(newValue);
  
  const oldValue = this.value;
  this.value = newValue;
  
  if (updatedBy) {
    this.metadata.lastModifiedBy = updatedBy._id;
    this.metadata.lastModifiedByModel = updatedBy.constructor.modelName;
  }
  
  this.metadata.changeLog.push({
    oldValue,
    newValue,
    changedBy: updatedBy?._id,
    changedByModel: updatedBy?.constructor.modelName,
    reason,
    timestamp: new Date()
  });
  
  this.metadata.version += 1;
  
  return this.save();
};

// Static method to get setting by key
settingSchema.statics.getSetting = function(key, defaultValue = null) {
  return this.findOne({ key, isActive: true }).then(setting => {
    if (!setting) return defaultValue;
    if (setting.isExpired) return defaultValue;
    return setting.value;
  });
};

// Static method to set setting
settingSchema.statics.setSetting = function(key, value, options = {}) {
  const {
    type = typeof value === 'object' ? (Array.isArray(value) ? 'array' : 'object') : typeof value,
    category = 'general',
    description,
    updatedBy,
    reason
  } = options;
  
  return this.findOneAndUpdate(
    { key },
    {
      $set: {
        value,
        type,
        category,
        description,
        'metadata.lastModifiedBy': updatedBy?._id,
        'metadata.lastModifiedByModel': updatedBy?.constructor.modelName,
        updatedAt: new Date()
      },
      $inc: { 'metadata.version': 1 },
      $push: {
        'metadata.changeLog': {
          newValue: value,
          changedBy: updatedBy?._id,
          changedByModel: updatedBy?.constructor.modelName,
          reason,
          timestamp: new Date()
        }
      }
    },
    { upsert: true, new: true }
  );
};

// Static method to get settings by category
settingSchema.statics.getByCategory = function(category, includePrivate = false) {
  const query = { category, isActive: true };
  if (!includePrivate) {
    query.isPublic = true;
  }
  
  return this.find(query).sort({ priority: -1, key: 1 });
};

// Static method to bulk update settings
settingSchema.statics.bulkUpdate = function(settings, updatedBy) {
  const operations = settings.map(({ key, value, ...options }) => ({
    updateOne: {
      filter: { key },
      update: {
        $set: {
          value,
          ...options,
          'metadata.lastModifiedBy': updatedBy?._id,
          'metadata.lastModifiedByModel': updatedBy?.constructor.modelName,
          updatedAt: new Date()
        },
        $inc: { 'metadata.version': 1 }
      },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations);
};

module.exports = mongoose.model('Setting', settingSchema);