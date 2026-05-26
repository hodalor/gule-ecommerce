const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const AdminSettings = require('../models/AdminSettings');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const logger = require('../config/logger');
const { uploadToCloudinary } = require('../utils/cloudinary');

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
    logger.warn('Settings rate limit exceeded', {
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
    logger.warn('Settings update rate limit exceeded', {
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

const DEFAULT_HOMEPAGE_CONTENT = {
  heroBanners: [
    {
      id: 'hero-1',
      title: 'Shop trusted products from local sellers',
      subtitle: 'Fast discovery, smooth ordering, and a modern multi-vendor buying experience.',
      ctaText: 'Shop products',
      ctaLink: '/products',
      imageUrl: '',
      publicId: '',
      showOverlay: true,
      showContent: true,
      isActive: true
    },
    {
      id: 'hero-2',
      title: 'Start as a buyer, upgrade later to seller',
      subtitle: 'Create one general account first, then add your business profile when you are ready to sell.',
      ctaText: 'Become a seller',
      ctaLink: '/become-seller',
      imageUrl: '',
      publicId: '',
      showOverlay: true,
      showContent: true,
      isActive: true
    },
    {
      id: 'hero-3',
      title: 'Featured products get priority placement',
      subtitle: 'Promote top products first while keeping new arrivals visible for ongoing discovery.',
      ctaText: 'See all products',
      ctaLink: '/products',
      imageUrl: '',
      publicId: '',
      showOverlay: true,
      showContent: true,
      isActive: true
    }
  ],
  promoAds: [
    {
      id: 'promo-1',
      title: 'Sell on Gule',
      text: 'Open your seller profile and start listing products.',
      ctaText: 'Sell now',
      ctaLink: '/become-seller',
      imageUrl: '',
      publicId: '',
      isActive: true
    },
    {
      id: 'promo-2',
      title: 'Track orders',
      text: 'Keep buyers updated and manage orders smoothly.',
      ctaText: 'View products',
      ctaLink: '/products',
      imageUrl: '',
      publicId: '',
      isActive: true
    },
    {
      id: 'promo-3',
      title: 'Browse all deals',
      text: 'Take buyers directly into the full catalog.',
      ctaText: 'See all products',
      ctaLink: '/products',
      imageUrl: '',
      publicId: '',
      isActive: true
    }
  ],
  highlightedCategoryIds: []
};

const normalizeContentItem = (item, prefix, index, type) => ({
  id: item?.id || `${prefix}-${index + 1}`,
  title: item?.title || '',
  subtitle: type === 'hero' ? (item?.subtitle || '') : undefined,
  text: type === 'promo' ? (item?.text || '') : undefined,
  ctaText: item?.ctaText || '',
  ctaLink: item?.ctaLink || '/products',
  imageUrl: item?.imageUrl || '',
  publicId: item?.publicId || '',
  showOverlay: type === 'hero' ? item?.showOverlay !== false : undefined,
  showContent: type === 'hero' ? item?.showContent !== false : undefined,
  isActive: item?.isActive !== false
});

const normalizeHomepageContent = (content = {}) => {
  const heroSource = Array.isArray(content.heroBanners) ? content.heroBanners : DEFAULT_HOMEPAGE_CONTENT.heroBanners;
  const promoSource = Array.isArray(content.promoAds) ? content.promoAds : DEFAULT_HOMEPAGE_CONTENT.promoAds;
  const highlightedCategoryIds = Array.isArray(content.highlightedCategoryIds)
    ? content.highlightedCategoryIds.filter(Boolean)
    : [];

  return {
    heroBanners: heroSource.map((item, index) => normalizeContentItem(item, 'hero', index, 'hero')),
    promoAds: promoSource.map((item, index) => normalizeContentItem(item, 'promo', index, 'promo')),
    highlightedCategoryIds
  };
};

const enrichContentImages = async (items = [], files = {}, folder) => {
  const normalizedFiles = files || {};
  return Promise.all(items.map(async (item, index) => {
    const explicitField = item?.imageUploadField;
    const fallbackField = `${folder}_${index}`;
    const uploadField = explicitField || fallbackField;
    const uploadFile = normalizedFiles[uploadField];

    if (!uploadFile) {
      return {
        ...item,
        imageUploadField: undefined
      };
    }

    const uploadResult = await uploadToCloudinary(uploadFile.tempFilePath || uploadFile.data, {
      folder: `gule/${folder}`
    });

    return {
      ...item,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      imageUploadField: undefined
    };
  }));
};

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
        
        logger.info('Default admin settings created', {
          adminId: req.user.id,
          ip: req.ip
        });

        return res.json({
          success: true,
          data: defaultSettings
        });
      }

      logger.info('Admin settings retrieved', {
        adminId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error retrieving admin settings', {
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
      const features = {
        autoApproveProducts: await AdminSettings.getValue('feature_auto_approve_products', false),
        escrowEnabled: await AdminSettings.getValue('feature_escrow_enabled', false),
        reviewsEnabled: await AdminSettings.getValue('feature_reviews_enabled', true),
        ratingsEnabled: await AdminSettings.getValue('feature_ratings_enabled', true),
        wishlistEnabled: await AdminSettings.getValue('feature_wishlist_enabled', true),
        compareEnabled: await AdminSettings.getValue('feature_compare_enabled', false),
        recommendationsEnabled: await AdminSettings.getValue('feature_recommendations_enabled', true)
      };

      return res.json({ success: true, data: { features } });
    } catch (error) {
      logger.error('Error retrieving public settings', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        ip: req.ip
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve public settings'
      });
    }
  }
);

router.get('/homepage-content/public', async (req, res) => {
  try {
    const content = await AdminSettings.getValue('homepage_content', DEFAULT_HOMEPAGE_CONTENT);

    return res.json({
      success: true,
      data: normalizeHomepageContent(content)
    });
  } catch (error) {
    logger.error('Error retrieving public homepage content', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve homepage content'
    });
  }
});

router.get('/homepage-content',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const content = await AdminSettings.getValue('homepage_content', DEFAULT_HOMEPAGE_CONTENT);

      return res.json({
        success: true,
        data: normalizeHomepageContent(content)
      });
    } catch (error) {
      logger.error('Error retrieving admin homepage content', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id,
        ip: req.ip
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve homepage content'
      });
    }
  }
);

router.put('/homepage-content',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const parsedContent = typeof req.body.content === 'string'
        ? JSON.parse(req.body.content)
        : (req.body.content || req.body);

      const normalizedContent = normalizeHomepageContent(parsedContent);
      const heroBanners = await enrichContentImages(normalizedContent.heroBanners, req.files, 'hero_banner');
      const promoAds = await enrichContentImages(normalizedContent.promoAds, req.files, 'promo_ad');

      const value = {
        heroBanners,
        promoAds,
        highlightedCategoryIds: normalizedContent.highlightedCategoryIds
      };

      const setting = await AdminSettings.findOneAndUpdate(
        { settingKey: 'homepage_content' },
        {
          $set: {
            settingKey: 'homepage_content',
            category: 'general',
            name: 'Homepage Content',
            description: 'Homepage banners, promo ads, and highlighted categories used by the storefront landing page.',
            value,
            defaultValue: DEFAULT_HOMEPAGE_CONTENT,
            dataType: 'object',
            isActive: true,
            isEditable: true,
            isSystem: false,
            isDynamic: true,
            lastModifiedBy: req.user._id,
            'ui.inputType': 'textarea',
            'ui.group': 'Content',
            permissions: {
              read: ['super_admin', 'admin'],
              write: ['super_admin', 'admin']
            },
            tags: ['homepage', 'content', 'banners', 'ads']
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: false,
          setDefaultsOnInsert: true
        }
      );

      await AuditLog.create({
        userId: req.user.id,
        userType: 'admin',
        action: 'HOMEPAGE_CONTENT_UPDATE',
        resource: 'AdminSettings',
        resourceId: setting._id,
        details: {
          heroBannerCount: heroBanners.length,
          promoAdCount: promoAds.length,
          highlightedCategoryIds: value.highlightedCategoryIds
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.json({
        success: true,
        message: 'Homepage content updated successfully',
        data: normalizeHomepageContent(value)
      });
    } catch (error) {
      logger.error('Error updating homepage content', {
        error: error.message,
        stack: error.stack,
        adminId: req.user?.id,
        ip: req.ip
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to update homepage content'
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
            userType: 'admin',
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
      await AuditLog.logAction({
        action: 'SETTINGS_UPDATE',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'AdminSettings',
        resourceId: settings._id,
        details: {
          updatedFields: Object.keys(req.body),
          originalSettings: originalSettings,
          newSettings: settings.toObject(),
          isSuperAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium',
        status: 'success'
      });

      logger.info('Admin settings updated', {
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
      logger.error('Error updating admin settings', {
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
    body('showBuyerDetailsToSellers').optional().isBoolean().withMessage('showBuyerDetailsToSellers must be a boolean'),
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
        userType: 'admin',
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

      logger.info('Privacy settings updated', {
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
      logger.error('Error updating privacy settings', {
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
        userType: 'admin',
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

      logger.info('Platform settings updated', {
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
      logger.error('Error updating platform settings', {
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
    body('autoApproveProducts').optional().isBoolean().withMessage('autoApproveProducts must be a boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user.id;

      const map = {
        autoApproveProducts: { key: 'feature_auto_approve_products', default: false, name: 'Auto Approve Products', desc: 'Automatically approve newly listed products' },
        escrowEnabled: { key: 'feature_escrow_enabled', default: false, name: 'Escrow Enabled', desc: 'Enable escrow for transactions' },
        reviewsEnabled: { key: 'feature_reviews_enabled', default: true, name: 'Reviews Enabled', desc: 'Enable product reviews' },
        ratingsEnabled: { key: 'feature_ratings_enabled', default: true, name: 'Ratings Enabled', desc: 'Enable product ratings' },
        wishlistEnabled: { key: 'feature_wishlist_enabled', default: true, name: 'Wishlist Enabled', desc: 'Enable wishlists' },
        compareEnabled: { key: 'feature_compare_enabled', default: false, name: 'Compare Enabled', desc: 'Enable product comparison' },
        recommendationsEnabled: { key: 'feature_recommendations_enabled', default: true, name: 'Recommendations Enabled', desc: 'Show product recommendations' }
      };

      const updatedFields = [];

      for (const field of Object.keys(map)) {
        if (req.body[field] === undefined) continue;
        updatedFields.push(field);
        const conf = map[field];

        let doc = await AdminSettings.findOne({ settingKey: conf.key });
        logger.info('Feature update attempt', {
          key: conf.key,
          hasExisting: !!doc,
          existingUiType: doc?.ui?.inputType,
          payloadValue: !!req.body[field]
        });

        await AdminSettings.updateOne(
          { settingKey: conf.key },
          {
            $set: {
              settingKey: conf.key,
              category: 'general',
              name: conf.name,
              description: conf.desc,
              value: !!req.body[field],
              defaultValue: conf.default,
              dataType: 'boolean',
              status: 'active',
              lastModifiedBy: userId,
              'ui.inputType': 'boolean',
              'ui.group': 'Features',
              permissions: { read: ['admin'], write: ['admin'] }
            }
          },
          { upsert: true, runValidators: true }
        );
      }

      await AuditLog.logAction({
        action: 'FEATURE_SETTINGS_UPDATE',
        performedBy: userId,
        userType: 'admin',
        userModel: 'Admin',
        module: 'settings',
        targetResource: 'AdminSettings',
        request: { method: req.method, url: req.originalUrl },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        changes: { summary: `Updated feature flags: ${updatedFields.join(', ')}` }
      });

      logger.info('Feature settings updated', { adminId: userId, updatedFields, ip: req.ip });

      const features = {};
      for (const field of Object.keys(map)) {
        features[field] = await AdminSettings.getValue(map[field].key, map[field].default);
      }

      return res.json({
        success: true,
        message: 'Feature settings updated successfully',
        data: features
      });
    } catch (error) {
      logger.error('Error updating feature settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        requestBody: req.body,
        ip: req.ip
      });

      return res.status(500).json({
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
          userType: 'admin',
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
        userType: 'admin',
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

      logger.warn('Admin settings reset to default', {
        adminId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Settings reset to default successfully',
        data: defaultSettings
      });
    } catch (error) {
      logger.error('Error resetting admin settings', {
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
        userType: 'admin',
        action: 'SETTINGS_BACKUP_CREATED',
        resource: 'AdminSettings',
        resourceId: settings._id,
        details: {
          backupTimestamp: new Date()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Settings backup created', {
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
      logger.error('Error creating settings backup', {
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

// System settings endpoints for admin UI compatibility
router.get('/system',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const data = {
        enableNotifications: await AdminSettings.getValue('notifications_enabled', true),
        emailNotifications: await AdminSettings.getValue('email_notifications_enabled', true),
        smsNotifications: await AdminSettings.getValue('sms_notifications_enabled', false),
        pushNotifications: await AdminSettings.getValue('push_notifications_enabled', false),
        notificationFrequency: await AdminSettings.getValue('notification_frequency', 'immediate')
      };

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Error retrieving system settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        ip: req.ip
      });

      return res.status(500).json({ success: false, error: 'Failed to retrieve system settings' });
    }
  }
);

router.patch('/system',
  updateRateLimit,
  authenticate,
  authorize(['admin']),
  [
    body('enableNotifications').optional().isBoolean(),
    body('emailNotifications').optional().isBoolean(),
    body('smsNotifications').optional().isBoolean(),
    body('pushNotifications').optional().isBoolean(),
    body('notificationFrequency').optional().isIn(['immediate', 'hourly', 'daily', 'weekly'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const map = {
        enableNotifications: 'notifications_enabled',
        emailNotifications: 'email_notifications_enabled',
        smsNotifications: 'sms_notifications_enabled',
        pushNotifications: 'push_notifications_enabled',
        notificationFrequency: 'notification_frequency'
      };

      const updatedFields = [];
      for (const [key, value] of Object.entries(req.body)) {
        const settingKey = map[key];
        if (!settingKey) continue;
        await AdminSettings.setValue(settingKey, value, req.user.id, `Updated ${key} via system settings API`);
        updatedFields.push(key);
      }

      await AuditLog.create({
        userId: req.user.id,
        userType: 'admin',
        action: 'SYSTEM_SETTINGS_UPDATE',
        resource: 'AdminSettings',
        details: { updatedFields },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const data = {
        enableNotifications: await AdminSettings.getValue('notifications_enabled', true),
        emailNotifications: await AdminSettings.getValue('email_notifications_enabled', true),
        smsNotifications: await AdminSettings.getValue('sms_notifications_enabled', false),
        pushNotifications: await AdminSettings.getValue('push_notifications_enabled', false),
        notificationFrequency: await AdminSettings.getValue('notification_frequency', 'immediate')
      };

      return res.json({ success: true, message: 'System settings updated successfully', data });
    } catch (error) {
      logger.error('Error updating system settings', {
        error: error.message,
        stack: error.stack,
        adminId: req.user.id,
        requestBody: req.body,
        ip: req.ip
      });

      return res.status(500).json({ success: false, error: 'Failed to update system settings' });
    }
  }
);

module.exports = router;
