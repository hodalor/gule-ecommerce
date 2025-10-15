const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const AdminSettings = require('../models/AdminSettings');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const winstonLogger = require('../config/logger');

// Rate limiting for settings endpoints
const settingsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many settings requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    winstonLogger.warn('Settings rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl
    });
    res.status(429).json({
      error: 'Too many settings requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiting for settings updates
const updateRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 update requests per windowMs
  message: {
    error: 'Too many settings update requests from this IP, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    winstonLogger.warn('Settings update rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      userId: req.user?.id
    });
    res.status(429).json({
      error: 'Too many settings update requests from this IP, please try again later.',
      retryAfter: '5 minutes'
    });
  }
});

// Apply rate limiting to all routes
router.use(settingsRateLimit);

// GET /api/settings - Get all admin settings (Admin only)
router.get('/',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const settings = await AdminSettings.findOne().select('-__v');
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = new AdminSettings();
        await defaultSettings.save();
        
        winstonLogger.info('Default admin settings created', {
          adminId: req.user.id,
          ip: req.ip
        });

        return res.json({
          success: true,
          data: defaultSettings
        });
      }

      winstonLogger.info('Admin settings retrieved', {
        adminId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      winstonLogger.error('Error retrieving admin settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve admin settings'
      });
    }
  }
);

// GET /api/settings/public - Get public settings (accessible to all authenticated users)
router.get('/public',
  authenticate,
  async (req, res) => {
    try {
      const settings = await AdminSettings.findOne().select(
        'privacy.showBuyerProfiles privacy.showSellerProfiles privacy.showBuyerStats privacy.showSellerStats ' +
        'platform.siteName platform.siteDescription platform.contactEmail platform.supportEmail ' +
        'platform.maintenanceMode platform.registrationEnabled platform.maxFileSize platform.allowedFileTypes ' +
        'security.sessionTimeout security.maxLoginAttempts security.accountLockoutDuration ' +
        'notifications.emailNotifications notifications.smsNotifications notifications.pushNotifications ' +
        'features.escrowEnabled features.reviewsEnabled features.ratingsEnabled features.wishlistEnabled ' +
        'features.compareEnabled features.recommendationsEnabled -_id -__v'
      );

      if (!settings) {
        return res.status(404).json({
          success: false,
          error: 'Settings not found'
        });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      winstonLogger.error('Error retrieving public settings', {
        error: error.message,
        stack: error.stack,
        userId: req.user.id,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve public settings'
      });
    }
  }
);

// PUT /api/settings - Update admin settings (Super Admin only)
router.put('/',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  [
    // Privacy settings validation
    body('privacy.showBuyerProfiles').optional().isBoolean().withMessage('showBuyerProfiles must be a boolean'),
    body('privacy.showSellerProfiles').optional().isBoolean().withMessage('showSellerProfiles must be a boolean'),
    body('privacy.showBuyerStats').optional().isBoolean().withMessage('showBuyerStats must be a boolean'),
    body('privacy.showSellerStats').optional().isBoolean().withMessage('showSellerStats must be a boolean'),
    
    // Platform settings validation
    body('platform.siteName').optional().isLength({ min: 1, max: 100 }).withMessage('Site name must be 1-100 characters'),
    body('platform.siteDescription').optional().isLength({ min: 1, max: 500 }).withMessage('Site description must be 1-500 characters'),
    body('platform.contactEmail').optional().isEmail().withMessage('Contact email must be valid'),
    body('platform.supportEmail').optional().isEmail().withMessage('Support email must be valid'),
    body('platform.maintenanceMode').optional().isBoolean().withMessage('maintenanceMode must be a boolean'),
    body('platform.registrationEnabled').optional().isBoolean().withMessage('registrationEnabled must be a boolean'),
    body('platform.maxFileSize').optional().isInt({ min: 1, max: 100 }).withMessage('maxFileSize must be 1-100 MB'),
    body('platform.allowedFileTypes').optional().isArray().withMessage('allowedFileTypes must be an array'),
    
    // Security settings validation
    body('security.sessionTimeout').optional().isInt({ min: 15, max: 1440 }).withMessage('sessionTimeout must be 15-1440 minutes'),
    body('security.maxLoginAttempts').optional().isInt({ min: 3, max: 10 }).withMessage('maxLoginAttempts must be 3-10'),
    body('security.accountLockoutDuration').optional().isInt({ min: 5, max: 1440 }).withMessage('accountLockoutDuration must be 5-1440 minutes'),
    body('security.passwordMinLength').optional().isInt({ min: 6, max: 50 }).withMessage('passwordMinLength must be 6-50 characters'),
    body('security.requireSpecialChars').optional().isBoolean().withMessage('requireSpecialChars must be a boolean'),
    body('security.requireNumbers').optional().isBoolean().withMessage('requireNumbers must be a boolean'),
    body('security.requireUppercase').optional().isBoolean().withMessage('requireUppercase must be a boolean'),
    
    // Notification settings validation
    body('notifications.emailNotifications').optional().isBoolean().withMessage('emailNotifications must be a boolean'),
    body('notifications.smsNotifications').optional().isBoolean().withMessage('smsNotifications must be a boolean'),
    body('notifications.pushNotifications').optional().isBoolean().withMessage('pushNotifications must be a boolean'),
    
    // Feature settings validation
    body('features.escrowEnabled').optional().isBoolean().withMessage('escrowEnabled must be a boolean'),
    body('features.reviewsEnabled').optional().isBoolean().withMessage('reviewsEnabled must be a boolean'),
    body('features.ratingsEnabled').optional().isBoolean().withMessage('ratingsEnabled must be a boolean'),
    body('features.wishlistEnabled').optional().isBoolean().withMessage('wishlistEnabled must be a boolean'),
    body('features.compareEnabled').optional().isBoolean().withMessage('compareEnabled must be a boolean'),
    body('features.recommendationsEnabled').optional().isBoolean().withMessage('recommendationsEnabled must be a boolean'),
    
    // Payment settings validation
    body('payment.currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
    body('payment.taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be 0-100%'),
    body('payment.processingFee').optional().isFloat({ min: 0, max: 10 }).withMessage('Processing fee must be 0-10%'),
    body('payment.escrowFee').optional().isFloat({ min: 0, max: 5 }).withMessage('Escrow fee must be 0-5%'),
    body('payment.autoReleaseHours').optional().isInt({ min: 24, max: 720 }).withMessage('Auto release must be 24-720 hours'),
    
    // Email settings validation
    body('email.smtpHost').optional().isLength({ min: 1, max: 255 }).withMessage('SMTP host must be 1-255 characters'),
    body('email.smtpPort').optional().isInt({ min: 1, max: 65535 }).withMessage('SMTP port must be 1-65535'),
    body('email.smtpUser').optional().isLength({ min: 1, max: 255 }).withMessage('SMTP user must be 1-255 characters'),
    body('email.smtpSecure').optional().isBoolean().withMessage('smtpSecure must be a boolean'),
    body('email.fromName').optional().isLength({ min: 1, max: 100 }).withMessage('From name must be 1-100 characters'),
    body('email.fromEmail').optional().isEmail().withMessage('From email must be valid'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if user has super admin privileges for sensitive settings
      const isSuperAdmin = req.user.role === 'admin' && req.user.permissions?.includes('super_admin');
      
      // Restrict certain settings to super admins only
      const restrictedFields = [
        'security.sessionTimeout',
        'security.maxLoginAttempts', 
        'security.accountLockoutDuration',
        'security.passwordMinLength',
        'security.requireSpecialChars',
        'security.requireNumbers',
        'security.requireUppercase',
        'payment.currency',
        'payment.taxRate',
        'payment.processingFee',
        'payment.escrowFee',
        'payment.autoReleaseHours',
        'email.smtpHost',
        'email.smtpPort',
        'email.smtpUser',
        'email.smtpPassword',
        'email.smtpSecure',
        'email.fromName',
        'email.fromEmail'
      ];

      // Check for restricted fields if not super admin
      if (!isSuperAdmin) {
        const hasRestrictedFields = restrictedFields.some(field => {
          const keys = field.split('.');
          let obj = req.body;
          for (const key of keys) {
            if (obj && typeof obj === 'object' && key in obj) {
              obj = obj[key];
            } else {
              return false;
            }
          }
          return true;
        });

        if (hasRestrictedFields) {
          await AuditLog.create({
            userId: req.user.id,
            userType: 'Admin',
            action: 'SETTINGS_UPDATE_UNAUTHORIZED',
            resource: 'AdminSettings',
            details: {
              attemptedFields: Object.keys(req.body),
              reason: 'Attempted to modify restricted settings without super admin privileges'
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(403).json({
            success: false,
            error: 'Insufficient privileges to modify these settings'
          });
        }
      }

      let settings = await AdminSettings.findOne();
      
      if (!settings) {
        settings = new AdminSettings();
      }

      // Store original settings for audit log
      const originalSettings = settings.toObject();

      // Update settings with provided data
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'object' && req.body[key] !== null) {
          if (!settings[key]) {
            settings[key] = {};
          }
          Object.assign(settings[key], req.body[key]);
        } else {
          settings[key] = req.body[key];
        }
      });

      settings.updatedBy = req.user.id;
      settings.updatedAt = new Date();

      await settings.save();

      // Create audit log
      await AuditLog.create({
        userId: req.user.id,
        userType: 'Admin',
        action: 'SETTINGS_UPDATE',
        resource: 'AdminSettings',
        resourceId: settings._id,
        details: {
          updatedFields: Object.keys(req.body),
          originalSettings: originalSettings,
          newSettings: settings.toObject(),
          isSuperAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      winstonLogger.info('Admin settings updated', {
        adminId: req.user.id,
        updatedFields: Object.keys(req.body),
        isSuperAdmin,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
      });
    } catch (error) {
      winstonLogger.error('Error updating admin settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        requestBody: req.body,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update admin settings'
      });
    }
  }
);

// PUT /api/settings/privacy - Update privacy settings (Admin only)
router.put('/privacy',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  [
    body('showBuyerProfiles').optional().isBoolean().withMessage('showBuyerProfiles must be a boolean'),
    body('showSellerProfiles').optional().isBoolean().withMessage('showSellerProfiles must be a boolean'),
    body('showBuyerStats').optional().isBoolean().withMessage('showBuyerStats must be a boolean'),
    body('showSellerStats').optional().isBoolean().withMessage('showSellerStats must be a boolean'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      let settings = await AdminSettings.findOne();
      
      if (!settings) {
        settings = new AdminSettings();
      }

      // Update privacy settings
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          settings.privacy[key] = req.body[key];
        }
      });

      settings.updatedBy = req.user.id;
      settings.updatedAt = new Date();

      await settings.save();

      // Create audit log
      await AuditLog.create({
        userId: req.user.id,
        userType: 'Admin',
        action: 'PRIVACY_SETTINGS_UPDATE',
        resource: 'AdminSettings',
        resourceId: settings._id,
        details: {
          updatedFields: Object.keys(req.body),
          newPrivacySettings: settings.privacy
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      winstonLogger.info('Privacy settings updated', {
        adminId: req.user.id,
        updatedFields: Object.keys(req.body),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        data: settings.privacy
      });
    } catch (error) {
      winstonLogger.error('Error updating privacy settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        requestBody: req.body,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update privacy settings'
      });
    }
  }
);

// PUT /api/settings/platform - Update platform settings (Admin only)
router.put('/platform',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  [
    body('siteName').optional().isLength({ min: 1, max: 100 }).withMessage('Site name must be 1-100 characters'),
    body('siteDescription').optional().isLength({ min: 1, max: 500 }).withMessage('Site description must be 1-500 characters'),
    body('contactEmail').optional().isEmail().withMessage('Contact email must be valid'),
    body('supportEmail').optional().isEmail().withMessage('Support email must be valid'),
    body('maintenanceMode').optional().isBoolean().withMessage('maintenanceMode must be a boolean'),
    body('registrationEnabled').optional().isBoolean().withMessage('registrationEnabled must be a boolean'),
    body('maxFileSize').optional().isInt({ min: 1, max: 100 }).withMessage('maxFileSize must be 1-100 MB'),
    body('allowedFileTypes').optional().isArray().withMessage('allowedFileTypes must be an array'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      let settings = await AdminSettings.findOne();
      
      if (!settings) {
        settings = new AdminSettings();
      }

      // Update platform settings
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          settings.platform[key] = req.body[key];
        }
      });

      settings.updatedBy = req.user.id;
      settings.updatedAt = new Date();

      await settings.save();

      // Create audit log
      await AuditLog.create({
        userId: req.user.id,
        userType: 'Admin',
        action: 'PLATFORM_SETTINGS_UPDATE',
        resource: 'AdminSettings',
        resourceId: settings._id,
        details: {
          updatedFields: Object.keys(req.body),
          newPlatformSettings: settings.platform
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      winstonLogger.info('Platform settings updated', {
        adminId: req.user.id,
        updatedFields: Object.keys(req.body),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Platform settings updated successfully',
        data: settings.platform
      });
    } catch (error) {
      winstonLogger.error('Error updating platform settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        requestBody: req.body,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update platform settings'
      });
    }
  }
);

// PUT /api/settings/features - Update feature settings (Admin only)
router.put('/features',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  [
    body('escrowEnabled').optional().isBoolean().withMessage('escrowEnabled must be a boolean'),
    body('reviewsEnabled').optional().isBoolean().withMessage('reviewsEnabled must be a boolean'),
    body('ratingsEnabled').optional().isBoolean().withMessage('ratingsEnabled must be a boolean'),
    body('wishlistEnabled').optional().isBoolean().withMessage('wishlistEnabled must be a boolean'),
    body('compareEnabled').optional().isBoolean().withMessage('compareEnabled must be a boolean'),
    body('recommendationsEnabled').optional().isBoolean().withMessage('recommendationsEnabled must be a boolean'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      let settings = await AdminSettings.findOne();
      
      if (!settings) {
        settings = new AdminSettings();
      }

      // Update feature settings
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          settings.features[key] = req.body[key];
        }
      });

      settings.updatedBy = req.user.id;
      settings.updatedAt = new Date();

      await settings.save();

      // Create audit log
      await AuditLog.create({
        userId: req.user.id,
        userType: 'Admin',
        action: 'FEATURE_SETTINGS_UPDATE',
        resource: 'AdminSettings',
        resourceId: settings._id,
        details: {
          updatedFields: Object.keys(req.body),
          newFeatureSettings: settings.features
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      winstonLogger.info('Feature settings updated', {
        adminId: req.user.id,
        updatedFields: Object.keys(req.body),
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Feature settings updated successfully',
        data: settings.features
      });
    } catch (error) {
      winstonLogger.error('Error updating feature settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        requestBody: req.body,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update feature settings'
      });
    }
  }
);

// POST /api/settings/reset - Reset settings to default (Super Admin only)
router.post('/reset',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      // Check if user has super admin privileges
      const isSuperAdmin = req.user.role === 'admin' && req.user.permissions?.includes('super_admin');
      
      if (!isSuperAdmin) {
        await AuditLog.create({
          userId: req.user.id,
          userType: 'Admin',
          action: 'SETTINGS_RESET_UNAUTHORIZED',
          resource: 'AdminSettings',
          details: {
            reason: 'Attempted to reset settings without super admin privileges'
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to reset settings'
        });
      }

      // Store current settings for audit log
      const currentSettings = await AdminSettings.findOne();
      
      // Delete current settings and create new default ones
      if (currentSettings) {
        await AdminSettings.deleteOne({ _id: currentSettings._id });
      }

      const defaultSettings = new AdminSettings();
      defaultSettings.updatedBy = req.user.id;
      await defaultSettings.save();

      // Create audit log
      await AuditLog.create({
        userId: req.user.id,
        userType: 'Admin',
        action: 'SETTINGS_RESET',
        resource: 'AdminSettings',
        resourceId: defaultSettings._id,
        details: {
          previousSettings: currentSettings?.toObject() || null,
          newSettings: defaultSettings.toObject()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      winstonLogger.warn('Admin settings reset to default', {
        adminId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Settings reset to default successfully',
        data: defaultSettings
      });
    } catch (error) {
      winstonLogger.error('Error resetting admin settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to reset admin settings'
      });
    }
  }
);

// GET /api/settings/backup - Create settings backup (Super Admin only)
router.get('/backup',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      // Check if user has super admin privileges
      const isSuperAdmin = req.user.role === 'admin' && req.user.permissions?.includes('super_admin');
      
      if (!isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient privileges to create settings backup'
        });
      }

      const settings = await AdminSettings.findOne().select('-__v');
      
      if (!settings) {
        return res.status(404).json({
          success: false,
          error: 'Settings not found'
        });
      }

      // Create audit log
      await AuditLog.create({
        userId: req.user.id,
        userType: 'Admin',
        action: 'SETTINGS_BACKUP_CREATED',
        resource: 'AdminSettings',
        resourceId: settings._id,
        details: {
          backupTimestamp: new Date()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      winstonLogger.info('Settings backup created', {
        adminId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Settings backup created successfully',
        data: {
          backup: settings,
          timestamp: new Date(),
          version: '1.0'
        }
      });
    } catch (error) {
      winstonLogger.error('Error creating settings backup', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create settings backup'
      });
    }
  }
);

module.exports = router;