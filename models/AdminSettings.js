const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminSettings:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated settings ID
 *         settingKey:
 *           type: string
 *           description: Unique setting identifier
 *         category:
 *           type: string
 *           enum: [privacy, payment, notification, security, general, escrow, review]
 *         name:
 *           type: string
 *           description: Human-readable setting name
 *         description:
 *           type: string
 *           description: Setting description
 *         value:
 *           type: object
 *           description: Setting value (flexible type)
 *         dataType:
 *           type: string
 *           enum: [string, number, boolean, object, array]
 *         isActive:
 *           type: boolean
 *           default: true
 *         isEditable:
 *           type: boolean
 *           default: true
 *         lastModifiedBy:
 *           type: string
 *           description: Admin who last modified the setting
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const adminSettingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    required: [true, 'Setting key is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_]+$/, 'Setting key can only contain lowercase letters, numbers, and underscores']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        'privacy', 'payment', 'notification', 'security', 'general', 
        'escrow', 'review', 'shipping', 'tax', 'commission', 'maintenance'
      ],
      message: 'Invalid setting category'
    }
  },
  name: {
    type: String,
    required: [true, 'Setting name is required'],
    trim: true,
    maxlength: [100, 'Setting name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Setting description is required'],
    trim: true,
    maxlength: [500, 'Setting description cannot exceed 500 characters']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Setting value is required']
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Default value is required']
  },
  dataType: {
    type: String,
    required: [true, 'Data type is required'],
    enum: {
      values: ['string', 'number', 'boolean', 'object', 'array', 'date'],
      message: 'Invalid data type'
    }
  },
  // Validation rules
  validation: {
    required: {
      type: Boolean,
      default: true
    },
    min: {
      type: Number,
      default: null
    },
    max: {
      type: Number,
      default: null
    },
    minLength: {
      type: Number,
      default: null
    },
    maxLength: {
      type: Number,
      default: null
    },
    pattern: {
      type: String,
      default: null
    },
    enum: [{
      type: String
    }],
    customValidator: {
      type: String,
      default: null
    }
  },
  // UI configuration
  ui: {
    inputType: {
      type: String,
      enum: ['text', 'number', 'boolean', 'select', 'multiselect', 'textarea', 'date', 'time', 'datetime', 'color', 'file'],
      default: 'text'
    },
    placeholder: {
      type: String,
      trim: true
    },
    helpText: {
      type: String,
      trim: true,
      maxlength: [200, 'Help text cannot exceed 200 characters']
    },
    options: [{
      label: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      disabled: {
        type: Boolean,
        default: false
      }
    }],
    group: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    isReadOnly: {
      type: Boolean,
      default: false
    }
  },
  // Access control
  permissions: {
    read: [{
      type: String,
      enum: ['super_admin', 'admin', 'accountant', 'review_officer', 'customer_support', 'marketing_manager']
    }],
    write: [{
      type: String,
      enum: ['super_admin', 'admin', 'accountant', 'review_officer', 'customer_support', 'marketing_manager']
    }]
  },
  // Status and lifecycle
  isActive: {
    type: Boolean,
    default: true
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isDynamic: {
    type: Boolean,
    default: false
  },
  // Audit trail
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Last modified by is required']
  },
  modificationHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Modification reason cannot exceed 200 characters']
    },
    ipAddress: {
      type: String,
      trim: true
    }
  }],
  // Dependencies and relationships
  dependencies: [{
    settingKey: {
      type: String,
      required: true
    },
    condition: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains'],
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  }],
  affects: [{
    type: String,
    trim: true
  }],
  // Environment and deployment
  environment: {
    type: String,
    enum: ['development', 'staging', 'production', 'all'],
    default: 'all'
  },
  version: {
    type: String,
    default: '1.0.0',
    match: [/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (x.y.z)']
  },
  // Caching and performance
  cache: {
    enabled: {
      type: Boolean,
      default: true
    },
    ttl: {
      type: Number,
      default: 3600 // 1 hour in seconds
    },
    key: {
      type: String,
      trim: true
    }
  },
  // Backup and recovery
  backup: {
    isBackedUp: {
      type: Boolean,
      default: false
    },
    lastBackupAt: {
      type: Date,
      default: null
    },
    backupLocation: {
      type: String,
      trim: true
    }
  },
  // Tags and metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  // Scheduling and automation
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    cronExpression: {
      type: String,
      trim: true
    },
    nextRun: {
      type: Date,
      default: null
    },
    lastRun: {
      type: Date,
      default: null
    },
    autoUpdate: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted value based on data type
adminSettingsSchema.virtual('formattedValue').get(function() {
  switch (this.dataType) {
    case 'boolean':
      return this.value ? 'Enabled' : 'Disabled';
    case 'date':
      return this.value ? new Date(this.value).toLocaleDateString() : null;
    case 'array':
      return Array.isArray(this.value) ? this.value.join(', ') : this.value;
    case 'object':
      return typeof this.value === 'object' ? JSON.stringify(this.value, null, 2) : this.value;
    default:
      return this.value;
  }
});

// Virtual for checking if setting has been modified
adminSettingsSchema.virtual('isModified').get(function() {
  return JSON.stringify(this.value) !== JSON.stringify(this.defaultValue);
});

// Virtual for getting modification count
adminSettingsSchema.virtual('modificationCount').get(function() {
  return this.modificationHistory ? this.modificationHistory.length : 0;
});

// Indexes for better query performance
adminSettingsSchema.index({ category: 1 });
adminSettingsSchema.index({ isActive: 1 });
adminSettingsSchema.index({ environment: 1 });
adminSettingsSchema.index({ 'ui.group': 1 });
adminSettingsSchema.index({ 'ui.order': 1 });
adminSettingsSchema.index({ tags: 1 });
adminSettingsSchema.index({ lastModifiedBy: 1 });
adminSettingsSchema.index({ updatedAt: -1 });

// Compound indexes
adminSettingsSchema.index({ category: 1, isActive: 1 });
adminSettingsSchema.index({ environment: 1, isActive: 1 });

// Pre-save middleware to track modifications and validate
adminSettingsSchema.pre('save', async function(next) {
  // Track modifications
  if (this.isModified('value') && !this.isNew) {
    const previousValue = this.getOriginal ? this.getOriginal('value') : null;
    
    this.modificationHistory.push({
      modifiedBy: this.lastModifiedBy,
      modifiedAt: new Date(),
      previousValue: previousValue,
      newValue: this.value,
      reason: this.modificationReason || 'Updated via admin panel'
    });
    
    // Keep only last 50 modifications
    if (this.modificationHistory.length > 50) {
      this.modificationHistory = this.modificationHistory.slice(-50);
    }
  }
  
  // Validate value based on data type and validation rules
  try {
    this.validateValue();
  } catch (error) {
    return next(error);
  }
  
  // Update cache key if needed
  if (this.cache.enabled && !this.cache.key) {
    this.cache.key = `setting:${this.settingKey}`;
  }
  
  next();
});

// Instance method to validate value
adminSettingsSchema.methods.validateValue = function() {
  const { value, dataType, validation } = this;
  
  // Required validation
  if (validation.required && (value === null || value === undefined || value === '')) {
    throw new Error(`Setting ${this.settingKey} is required`);
  }
  
  // Data type validation
  switch (dataType) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error(`Setting ${this.settingKey} must be a string`);
      }
      if (validation.minLength && value.length < validation.minLength) {
        throw new Error(`Setting ${this.settingKey} must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        throw new Error(`Setting ${this.settingKey} cannot exceed ${validation.maxLength} characters`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        throw new Error(`Setting ${this.settingKey} does not match required pattern`);
      }
      break;
      
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`Setting ${this.settingKey} must be a valid number`);
      }
      if (validation.min !== null && value < validation.min) {
        throw new Error(`Setting ${this.settingKey} must be at least ${validation.min}`);
      }
      if (validation.max !== null && value > validation.max) {
        throw new Error(`Setting ${this.settingKey} cannot exceed ${validation.max}`);
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`Setting ${this.settingKey} must be a boolean`);
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error(`Setting ${this.settingKey} must be an array`);
      }
      if (validation.minLength && value.length < validation.minLength) {
        throw new Error(`Setting ${this.settingKey} must have at least ${validation.minLength} items`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        throw new Error(`Setting ${this.settingKey} cannot have more than ${validation.maxLength} items`);
      }
      break;
      
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        throw new Error(`Setting ${this.settingKey} must be an object`);
      }
      break;
      
    case 'date':
      if (!(value instanceof Date) && !Date.parse(value)) {
        throw new Error(`Setting ${this.settingKey} must be a valid date`);
      }
      break;
  }
  
  // Enum validation
  if (validation.enum && validation.enum.length > 0) {
    if (!validation.enum.includes(value)) {
      throw new Error(`Setting ${this.settingKey} must be one of: ${validation.enum.join(', ')}`);
    }
  }
  
  return true;
};

// Instance method to reset to default value
adminSettingsSchema.methods.resetToDefault = function(modifiedBy, reason = 'Reset to default value') {
  this.value = this.defaultValue;
  this.lastModifiedBy = modifiedBy;
  this.modificationReason = reason;
  return this.save();
};

// Instance method to check if user has permission
adminSettingsSchema.methods.hasPermission = function(userRole, action = 'read') {
  const permissions = this.permissions[action] || [];
  return permissions.length === 0 || permissions.includes(userRole) || userRole === 'super_admin';
};

// Instance method to get sanitized value for user
adminSettingsSchema.methods.getSanitizedValue = function(userRole) {
  if (!this.hasPermission(userRole, 'read')) {
    return null;
  }
  
  // Return formatted value for display
  return {
    key: this.settingKey,
    name: this.name,
    description: this.description,
    value: this.value,
    formattedValue: this.formattedValue,
    dataType: this.dataType,
    category: this.category,
    isEditable: this.isEditable && this.hasPermission(userRole, 'write'),
    ui: this.ui
  };
};

// Static method to get settings by category
adminSettingsSchema.statics.getByCategory = function(category, userRole = null) {
  const query = { category, isActive: true };
  
  if (userRole && userRole !== 'super_admin') {
    query.$or = [
      { 'permissions.read': { $size: 0 } },
      { 'permissions.read': userRole }
    ];
  }
  
  return this.find(query).sort({ 'ui.order': 1, name: 1 });
};

// Static method to get setting by key
adminSettingsSchema.statics.getByKey = function(key) {
  return this.findOne({ settingKey: key, isActive: true });
};

// Static method to get setting value by key
adminSettingsSchema.statics.getValue = function(key, defaultValue = null) {
  return this.findOne({ settingKey: key, isActive: true })
    .then(setting => setting ? setting.value : defaultValue);
};

// Static method to set setting value
adminSettingsSchema.statics.setValue = function(key, value, modifiedBy, reason = 'Updated via API') {
  return this.findOneAndUpdate(
    { settingKey: key },
    { 
      value, 
      lastModifiedBy: modifiedBy,
      modificationReason: reason
    },
    { new: true, runValidators: true }
  );
};

// Static method to get all settings for export
adminSettingsSchema.statics.exportSettings = function(environment = 'all') {
  const query = { isActive: true };
  if (environment !== 'all') {
    query.environment = { $in: [environment, 'all'] };
  }
  
  return this.find(query).select('settingKey category value dataType environment version');
};

// Static method to import settings
adminSettingsSchema.statics.importSettings = function(settings, modifiedBy) {
  const operations = settings.map(setting => ({
    updateOne: {
      filter: { settingKey: setting.settingKey },
      update: {
        $set: {
          value: setting.value,
          lastModifiedBy: modifiedBy,
          modificationReason: 'Imported from backup'
        }
      },
      upsert: false
    }
  }));
  
  return this.bulkWrite(operations);
};

// Static method to get settings that need backup
adminSettingsSchema.statics.getNeedingBackup = function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    isActive: true,
    isSystem: false,
    $or: [
      { 'backup.isBackedUp': false },
      { 'backup.lastBackupAt': { $lt: oneDayAgo } }
    ]
  });
};

// Static method to initialize default settings
adminSettingsSchema.statics.initializeDefaults = function(adminId) {
  const defaultSettings = [
    // Privacy Settings
    {
      settingKey: 'share_buyer_contact',
      category: 'privacy',
      name: 'Share Buyer Contact Information',
      description: 'Allow sellers to see buyer contact information in orders',
      value: false,
      defaultValue: false,
      dataType: 'boolean',
      ui: { inputType: 'boolean', group: 'Privacy', order: 1 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin', 'admin'] }
    },
    {
      settingKey: 'share_buyer_address',
      category: 'privacy',
      name: 'Share Buyer Address',
      description: 'Allow sellers to see buyer shipping address',
      value: true,
      defaultValue: true,
      dataType: 'boolean',
      ui: { inputType: 'boolean', group: 'Privacy', order: 2 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin', 'admin'] }
    },
    {
      settingKey: 'buyer_ref_token_length',
      category: 'privacy',
      name: 'Buyer Reference Token Length',
      description: 'Length of buyer reference tokens for privacy',
      value: 8,
      defaultValue: 8,
      dataType: 'number',
      validation: { min: 6, max: 16 },
      ui: { inputType: 'number', group: 'Privacy', order: 3 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin'] }
    },
    
    // Escrow Settings
    {
      settingKey: 'default_hold_period_days',
      category: 'escrow',
      name: 'Default Hold Period (Days)',
      description: 'Default number of days to hold payments in escrow',
      value: 7,
      defaultValue: 7,
      dataType: 'number',
      validation: { min: 1, max: 30 },
      ui: { inputType: 'number', group: 'Escrow', order: 1 },
      permissions: { read: ['super_admin', 'admin', 'accountant'], write: ['super_admin', 'admin'] }
    },
    {
      settingKey: 'auto_release_enabled',
      category: 'escrow',
      name: 'Auto Release Enabled',
      description: 'Automatically release funds after hold period expires',
      value: true,
      defaultValue: true,
      dataType: 'boolean',
      ui: { inputType: 'boolean', group: 'Escrow', order: 2 },
      permissions: { read: ['super_admin', 'admin', 'accountant'], write: ['super_admin', 'admin'] }
    },
    {
      settingKey: 'escrow_fee_percentage',
      category: 'escrow',
      name: 'Escrow Fee Percentage',
      description: 'Percentage fee charged for escrow services',
      value: 2.5,
      defaultValue: 2.5,
      dataType: 'number',
      validation: { min: 0, max: 10 },
      ui: { inputType: 'number', group: 'Escrow', order: 3 },
      permissions: { read: ['super_admin', 'admin', 'accountant'], write: ['super_admin'] }
    },
    
    // Commission Settings
    {
      settingKey: 'platform_commission_percentage',
      category: 'commission',
      name: 'Platform Commission Percentage',
      description: 'Default commission percentage charged to sellers',
      value: 5.0,
      defaultValue: 5.0,
      dataType: 'number',
      validation: { min: 0, max: 20 },
      ui: { inputType: 'number', group: 'Commission', order: 1 },
      permissions: { read: ['super_admin', 'admin', 'accountant'], write: ['super_admin'] }
    },
    
    // Review Settings
    {
      settingKey: 'auto_assign_reviews',
      category: 'review',
      name: 'Auto Assign Reviews',
      description: 'Automatically assign product reviews to officers',
      value: true,
      defaultValue: true,
      dataType: 'boolean',
      ui: { inputType: 'boolean', group: 'Review', order: 1 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin', 'admin'] }
    },
    {
      settingKey: 'review_deadline_days',
      category: 'review',
      name: 'Review Deadline (Days)',
      description: 'Number of days to complete product reviews',
      value: 3,
      defaultValue: 3,
      dataType: 'number',
      validation: { min: 1, max: 14 },
      ui: { inputType: 'number', group: 'Review', order: 2 },
      permissions: { read: ['super_admin', 'admin', 'review_officer'], write: ['super_admin', 'admin'] }
    },
    
    // Notification Settings
    {
      settingKey: 'email_notifications_enabled',
      category: 'notification',
      name: 'Email Notifications Enabled',
      description: 'Enable email notifications system-wide',
      value: true,
      defaultValue: true,
      dataType: 'boolean',
      ui: { inputType: 'boolean', group: 'Notifications', order: 1 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin', 'admin'] }
    },
    {
      settingKey: 'sms_notifications_enabled',
      category: 'notification',
      name: 'SMS Notifications Enabled',
      description: 'Enable SMS notifications system-wide',
      value: false,
      defaultValue: false,
      dataType: 'boolean',
      ui: { inputType: 'boolean', group: 'Notifications', order: 2 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin', 'admin'] }
    },
    
    // Security Settings
    {
      settingKey: 'max_login_attempts',
      category: 'security',
      name: 'Maximum Login Attempts',
      description: 'Maximum failed login attempts before account lockout',
      value: 5,
      defaultValue: 5,
      dataType: 'number',
      validation: { min: 3, max: 10 },
      ui: { inputType: 'number', group: 'Security', order: 1 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin'] }
    },
    {
      settingKey: 'session_timeout_minutes',
      category: 'security',
      name: 'Session Timeout (Minutes)',
      description: 'User session timeout in minutes',
      value: 60,
      defaultValue: 60,
      dataType: 'number',
      validation: { min: 15, max: 480 },
      ui: { inputType: 'number', group: 'Security', order: 2 },
      permissions: { read: ['super_admin', 'admin'], write: ['super_admin'] }
    }
  ];
  
  const operations = defaultSettings.map(setting => ({
    updateOne: {
      filter: { settingKey: setting.settingKey },
      update: {
        $setOnInsert: {
          ...setting,
          lastModifiedBy: adminId,
          isSystem: true
        }
      },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations);
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);