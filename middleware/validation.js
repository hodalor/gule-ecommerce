const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    logger.warn('Validation failed', {
      errors: formattedErrors,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Please check the provided information and correct the following errors:',
      validationErrors: formattedErrors,
      details: `${formattedErrors.length} field(s) contain invalid data`,
      totalErrors: formattedErrors.length
    });
  }
  
  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),

  // Password validation
  password: (field = 'password') => body(field)
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  // Phone validation
  phone: (field = 'phone') => 
    body(field)
      .optional()
      .matches(/^[+]?[0-9\s\-()]{7,15}$/)
      .withMessage('Please provide a valid phone number'),

  // Name validation
  name: (field) => body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} must be between 2 and 50 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`),

  // MongoDB ObjectId validation
  objectId: (field) => param(field)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),

  // URL validation
  url: (field) => body(field)
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),

  // Price validation
  price: (field = 'price') => body(field)
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number')
    .toFloat(),

  // Quantity validation
  quantity: (field = 'quantity') => body(field)
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
    .toInt(),

  // Date validation
  date: (field) => body(field)
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .toDate(),

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort')
      .optional()
      .matches(/^[a-zA-Z_]+(:asc|:desc)?$/)
      .withMessage('Sort format should be field:asc or field:desc')
  ],

  // Search validation
  search: () => query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape()
};

/**
 * User registration validation
 */
const validateUserRegistration = [
  commonValidations.name('firstName'),
  commonValidations.name('lastName'),
  commonValidations.email(),
  commonValidations.password(),
  commonValidations.phone(),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address must not exceed 100 characters'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters'),
  
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),
  
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code must not exceed 20 characters'),
  
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),

  handleValidationErrors
];

/**
 * Order update validation (for status updates)
 */
const validateOrderUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Invalid order status'),
  
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tracking number must be between 1 and 100 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),

  handleValidationErrors
];

/**
 * Seller registration validation
 */
const validateSellerRegistration = [
  commonValidations.name('firstName'),
  commonValidations.name('lastName'),
  commonValidations.email(),
  commonValidations.password(),
  body('phone')
    .optional()
    .matches(/^[+]?[0-9\s\-()]{7,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('businessType')
    .isIn(['individual', 'company', 'partnership'])
    .withMessage('Invalid business type'),
  
  body('businessRegistrationNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Business registration number must not exceed 50 characters'),
  
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax ID must not exceed 50 characters'),
  
  body('businessDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Business description must not exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Login validation
 */
const validateLogin = [
  commonValidations.email(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean')
    .toBoolean(),

  handleValidationErrors
];

/**
 * Product validation
 */
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Product description must be between 10 and 5000 characters'),
  
  commonValidations.price(),
  
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subcategory must not exceed 50 characters'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must not exceed 50 characters'),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SKU must not exceed 50 characters'),
  
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
    .toInt(),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number')
    .toFloat(),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number')
    .toFloat(),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number')
    .toFloat(),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number')
    .toFloat(),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),

  handleValidationErrors
];

/**
 * Product update validation (similar to validateProduct but with optional fields)
 */
const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Product description must be between 10 and 5000 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number')
    .toFloat(),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Subcategory must not exceed 50 characters'),
  
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Brand must not exceed 50 characters'),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SKU must not exceed 50 characters'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
    .toInt(),
  
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number')
    .toFloat(),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number')
    .toFloat(),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number')
    .toFloat(),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number')
    .toFloat(),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),

  handleValidationErrors
];

/**
 * Order validation
 */
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('items.*.product')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid product ID');
      }
      return true;
    }),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
    .toInt(),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number')
    .toFloat(),
  
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  
  body('shippingAddress.zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required'),
  
  body('shippingAddress.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  
  body('paymentMethod')
    .isIn(['card', 'mobile_money', 'bank_transfer', 'cash_on_delivery'])
    .withMessage('Invalid payment method'),

  handleValidationErrors
];

/**
 * Review validation
 */
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .toInt(),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters'),

  handleValidationErrors
];

/**
 * Review update validation
 */
const validateReviewUpdate = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
    .toInt(),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters'),

  handleValidationErrors
];

/**
 * Admin registration validation
 */
const validateAdminRegistration = [
  commonValidations.name('firstName'),
  commonValidations.name('lastName'),
  commonValidations.email(),
  commonValidations.phone(),
  commonValidations.password(),
  
  body('role')
    .isIn(['super_admin', 'admin', 'accountant', 'review_officer', 'customer_support', 'marketing_manager'])
    .withMessage('Invalid admin role'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department must not exceed 50 characters'),
  
  body('jobTitle')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Job title must not exceed 100 characters'),

  handleValidationErrors
];

/**
 * Admin validation
 */
const validateAdmin = [
  commonValidations.name('firstName'),
  commonValidations.name('lastName'),
  commonValidations.email(),
  commonValidations.phone(),
  
  body('role')
    .isIn(['super_admin', 'admin', 'accountant', 'review_officer', 'customer_support', 'marketing_manager'])
    .withMessage('Invalid admin role'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Department must not exceed 50 characters'),
  
  body('jobTitle')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Job title must not exceed 100 characters'),

  handleValidationErrors
];

/**
 * Password reset validation
 */
const validatePasswordReset = [
  commonValidations.email(),
  handleValidationErrors
];

/**
 * Password update validation
 */
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  commonValidations.password('newPassword'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Profile update validation
 */
const validateProfileUpdate = [
  commonValidations.name('firstName').optional(),
  commonValidations.name('lastName').optional(),
  commonValidations.phone().optional(),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),

  handleValidationErrors
];

/**
 * Escrow validation
 */
const validateEscrow = [
  body('orderId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid order ID');
      }
      return true;
    }),
  
  body('holdPeriod')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Hold period must be between 1 and 30 days')
    .toInt(),

  handleValidationErrors
];

/**
 * File upload validation
 */
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const files = req.files || [req.file];
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default

    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        });
      }

      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
        });
      }
    }

    next();
  };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize string fields
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = validator.escape(obj[key].trim());
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Custom validation for specific business rules
 */
const customValidations = {
  // Validate that seller owns the product
  validateProductOwnership: async (req, res, next) => {
    try {
      if (req.userType === 'seller' && req.body.seller && req.body.seller !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only create products for your own seller account'
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  },

  // Validate order items availability
  validateOrderItems: async (req, res, next) => {
    try {
      const Product = require('../models/Product');
      const items = req.body.items;

      for (const item of items) {
        const product = await Product.findById(item.product);
        
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product with ID ${item.product} not found`
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          });
        }

        if (product.status !== 'active') {
          return res.status(400).json({
            success: false,
            message: `Product ${product.name} is not available for purchase`
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }
};

/**
 * Validation for pagination parameters
 */
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort').optional().isIn(['createdAt', 'updatedAt', 'price', 'rating', 'name']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
];

/**
 * Validation for search parameters
 */
const validateSearch = [
  query('q').optional().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),
  query('category').optional().isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  query('location').optional().isLength({ min: 1, max: 100 }).withMessage('Location must be between 1 and 100 characters')
];

module.exports = {
  handleValidationErrors,
  commonValidations,
  validateUserRegistration,
  validateSellerRegistration,
  validateLogin,
  validateProduct,
  validateProductUpdate,
  validateOrder,
  validateOrderUpdate,
  validateReview,
  validateReviewUpdate,
  validateAdmin,
  validateAdminRegistration,
  validatePasswordReset,
  validatePasswordUpdate,
  validateProfileUpdate,
  validateEscrow,
  validateFileUpload,
  validatePagination,
  validateSearch,
  sanitizeInput,
  customValidations
};