const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import models
const { User, Seller, Admin, AuditLog } = require('../models');

// Import middleware
const { 
  authenticate, 
  authorizeUserType,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  authRateLimit
} = require('../middleware/auth');
const { authRateLimit: refreshTokenLimiter } = require('../middleware/security');
const { 
  handleValidationErrors,
  validateUserRegistration,
  validateSellerRegistration,
  validateLogin,
  validatePasswordReset,
  validatePasswordUpdate
} = require('../middleware/validation');

// Import utilities
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const logger = require('../utils/logger');


const router = express.Router();


const normalizeAuthUser = (user, userType) => {
  const baseUser = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email: user.email,
    phone: user.phone || '',
    userType,
    isVerified: Boolean(
      user.isVerified ??
      user.isEmailVerified ??
      (user.verificationStatus === 'verified')
    ),
    isActive: user.isActive !== false,
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    address: user.address || {}
  };

  if (userType === 'seller') {
    return {
      ...baseUser,
      businessName: user.businessName,
      businessType: user.businessType,
      verificationStatus: user.verificationStatus,
      taxNumber: user.taxNumber || '',
      businessAddress: user.businessAddress || {},
      businessRegistrationNumber: user.businessRegistrationNumber || ''
    };
  }

  if (userType === 'admin') {
    return {
      ...baseUser,
      role: user.role,
      permissions: user.permissions,
      employeeId: user.employeeId
    };
  }

  return baseUser;
};

const normalizeOptionalEmail = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};


// Rate limiting for auth endpoints
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Buyer Registration
router.post('/register/buyer', 
  // strictAuthLimiter, // Temporarily disabled for testing
  validateUserRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        password, 
        phone, 
        dateOfBirth,
        address 
      } = req.body;
      const normalizedEmail = normalizeOptionalEmail(email);

      // Check if user already exists
      const duplicateChecks = [{ phone }];
      if (normalizedEmail) {
        duplicateChecks.push({ email: normalizedEmail });
      }
      const existingBuyer = await User.findOne({ $or: duplicateChecks });
      
      if (existingBuyer) {
        // Log registration attempt for duplicate user (optional logging)
        // Temporarily disabled AuditLog to test registration
        /*
        try {
          await AuditLog.logAction({
            logId: crypto.randomBytes(16).toString('hex'),
            action: 'REGISTRATION_ATTEMPT_DUPLICATE',
            actionType: 'create',
            module: 'auth',
            performedBy: new mongoose.Types.ObjectId(), // System user placeholder
            userModel: 'User',
            userType: 'system',
            targetResource: 'User',
            targetId: new mongoose.Types.ObjectId(),
            targetModel: 'User',
            request: {
              method: req.method,
              url: req.originalUrl
            },
            response: {
              statusCode: 409
            },
            session: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            },
            severity: 'medium',
            status: 'failure',
            metadata: { email, phone, reason: 'duplicate_credentials' }
          });
        } catch (auditError) {
          // Log audit error but don't fail the request
          logger.warn('Failed to log audit entry', { error: auditError.message });
        }
        */

        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email or phone number already exists'
        });
      }

      // Create buyer (password will be hashed by model middleware)
      console.log('Creating buyer with password:', password);
      console.log('Password type:', typeof password);
      console.log('Password length:', password.length);
      const buyer = new User({
        firstName,
        lastName,
        email: normalizedEmail || undefined,
        password,
        phone,
        dateOfBirth,
        address,
        isVerified: !normalizedEmail,
        isEmailVerified: !normalizedEmail,
        isActive: true,
        lastLogin: null
      });

      await buyer.save();

      // Generate email verification token
      let emailVerificationSent = false;
      if (normalizedEmail) {
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        buyer.emailVerificationToken = emailVerificationToken;
        buyer.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await buyer.save();

        // Send verification email
        try {
          await sendVerificationEmail(
            normalizedEmail,
            `${firstName} ${lastName}`,
            emailVerificationToken,
            'buyer'
          );
          emailVerificationSent = true;
        } catch (emailError) {
          logger.error('Failed to send verification email', emailError);
        }
      }

      // Log successful registration
      // Temporarily disabled AuditLog to test registration
      /*
      try {
        await AuditLog.logAction({
          logId: crypto.randomBytes(16).toString('hex'),
          action: 'USER_REGISTRATION',
          actionType: 'create',
          module: 'auth',
          performedBy: buyer._id,
          userModel: 'User',
          userType: 'user',
          targetResource: 'User',
          targetId: buyer._id,
          targetModel: 'User',
          request: {
            method: req.method,
            url: req.originalUrl
          },
          response: {
            statusCode: 201
          },
          session: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          severity: 'low',
          status: 'success',
          metadata: { email, phone, firstName, lastName }
        });
      } catch (auditError) {
        logger.warn('Failed to log audit entry', { error: auditError.message });
      }
      */

      // Generate tokens
      const accessToken = generateToken(buyer._id, buyer.role, 'buyer');
      const refreshToken = generateRefreshToken(buyer._id, 'buyer');

      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        message: 'Registration successful',
        user: normalizeAuthUser(buyer, 'buyer'),
        accessToken,
        emailVerificationSent
      });

    } catch (error) {
      logger.error('Buyer registration error', { error: error.message, stack: error.stack });

      if (error?.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
        const isLegacyIndexConflict = duplicateField === 'userId' || duplicateField === 'vendorId';

        return res.status(isLegacyIndexConflict ? 500 : 409).json({
          error: isLegacyIndexConflict ? 'Registration temporarily unavailable' : 'User already exists',
          message: isLegacyIndexConflict
            ? 'Account creation is blocked by an outdated database index. Restart the backend to apply the automatic repair.'
            : 'An account with this email or phone number already exists'
        });
      }
      
      // Log registration error (optional logging)
      // Temporarily disabled AuditLog to test registration
      /*
      try {
        await AuditLog.logAction({
          logId: crypto.randomBytes(16).toString('hex'),
          action: 'BUYER_REGISTRATION_ERROR',
          actionType: 'create',
          module: 'auth',
          performedBy: new mongoose.Types.ObjectId(), // System user placeholder
          userModel: 'User',
          userType: 'system',
          targetResource: 'User',
          targetId: new mongoose.Types.ObjectId(),
          targetModel: 'User',
          request: {
            method: req.method,
            url: req.originalUrl
          },
          response: {
            statusCode: 500
          },
          session: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          severity: 'high',
          status: 'failure',
          metadata: { error: error.message, email: req.body.email }
        });
      } catch (auditError) {
        // Log audit error but don't fail the request
        logger.warn('Failed to log audit entry', { error: auditError.message });
      }
      */

      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration. Please try again.'
      });
    }
  }
);

// Seller Registration
router.post('/register/seller',
  strictAuthLimiter,
  validateSellerRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        phone,
        businessName,
        businessType,
        businessRegistrationNumber,
        taxId,
        businessAddress,
        businessDescription,
        website,
        socialMedia
      } = req.body;

      // Check if seller already exists
      const query = {
        $or: [
          { email },
          { phone }
        ]
      };

      // Only add businessRegistrationNumber and taxId to query if they are provided
      if (businessRegistrationNumber) {
        query.$or.push({ businessRegistrationNumber });
      }
      if (taxId) {
        query.$or.push({ taxNumber: taxId });
      }

      const existingSeller = await Seller.findOne(query);

      // Temporarily disabled AuditLog to test registration
      /*
      if (existingSeller) {
        await AuditLog.logAction({
          action: 'SELLER_REGISTRATION_ATTEMPT_DUPLICATE',
          userId: null,
          userType: 'seller',
          resourceType: 'Seller',
          details: { 
            email, 
            phone, 
            businessName,
            businessRegistrationNumber,
            reason: 'duplicate_credentials' 
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

        return res.status(409).json({
          error: 'Seller already exists',
          message: 'A seller account with these credentials already exists'
        });
      }
      */

      if (existingSeller) {
        // Determine which field caused the conflict
        let conflictField = '';
        let conflictMessage = '';
        
        if (existingSeller.email === email) {
          conflictField = 'email';
          conflictMessage = 'A seller account with this email address already exists';
        } else if (existingSeller.phone === phone) {
          conflictField = 'phone';
          conflictMessage = 'A seller account with this phone number already exists';
        } else if (businessRegistrationNumber && existingSeller.businessRegistrationNumber === businessRegistrationNumber) {
          conflictField = 'businessRegistrationNumber';
          conflictMessage = 'A seller account with this business registration number already exists';
        } else if (taxId && existingSeller.taxNumber === taxId) {
          conflictField = 'taxId';
          conflictMessage = 'A seller account with this tax ID already exists';
        } else {
          conflictMessage = 'A seller account with these credentials already exists';
        }

        return res.status(409).json({
          success: false,
          error: 'Seller already exists',
          message: conflictMessage,
          field: conflictField,
          details: 'Please use different credentials or login if you already have an account'
        });
      }

      // Create seller (password will be hashed by model middleware)
      const seller = new Seller({
        firstName,
        lastName,
        email,
        password,
        phone,
        businessName,
        businessType,
        businessRegistrationNumber,
        taxNumber: taxId,
        businessAddress,
        businessDescription,
        website,
        socialMedia,
        isVerified: false,
        isEmailVerified: false,
        verificationStatus: 'pending',
        isActive: true,
        status: 'active',
        lastLogin: null
      });

      await seller.save();

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      seller.emailVerificationToken = emailVerificationToken;
      seller.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await seller.save();

      // Send verification email
      try {
        await sendVerificationEmail(
          email,
          `${firstName} ${lastName}`,
          emailVerificationToken,
          'seller'
        );
      } catch (emailError) {
        logger.error('Failed to send seller verification email', emailError);
      }

      // Temporarily disabled AuditLog to test registration
      /*
      await AuditLog.logAction({
        action: 'SELLER_REGISTRATION',
        userId: seller._id,
        userType: 'seller',
        resourceType: 'Seller',
        resourceId: seller._id,
        details: { 
          email, 
          phone, 
          businessName, 
          businessType,
          businessRegistrationNumber 
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });
      */

      // Generate tokens
      const accessToken = generateToken(seller._id, seller.role, 'seller');
      const refreshToken = generateRefreshToken(seller._id, 'seller');

      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'Seller registration successful! Please check your email for verification instructions.',
        user: normalizeAuthUser(seller, 'seller'),
        accessToken,
        emailVerificationSent: true,
        nextSteps: [
          'Check your email for verification link',
          'Complete email verification',
          'Wait for admin approval',
          'You will be notified once your account is approved'
        ]
      });

    } catch (error) {
      console.log('Seller registration error details:', error);
      logger.error('Seller registration error', error);
      
      // Temporarily disabled AuditLog to test registration
      /*
      await AuditLog.logAction({
        action: 'SELLER_REGISTRATION_ERROR',
        userId: null,
        userType: 'seller',
        resourceType: 'Seller',
        details: { error: error.message, email: req.body.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });
      */

      // Handle validation errors specifically
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Please check the provided information and try again.',
          validationErrors,
          details: 'One or more fields contain invalid data'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Seller registration failed',
        message: 'An unexpected error occurred during registration. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Login
router.post('/login',
  // authRateLimit, // Temporarily disabled for testing
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { identifier, email, password, userType } = req.body;
      const loginIdentifier = (identifier || email || '').trim();
      logger.info('Login attempt', {
        identifier: loginIdentifier,
        userType,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      let user;
      let Model;
      let resolvedUserType = userType;

      // Determine which model to use
      switch (userType) {
        case 'buyer':
          Model = User;
          break;
        case 'seller':
          Model = Seller;
          break;
        case 'admin':
          Model = Admin;
          break;
        default:
          return res.status(400).json({
            error: 'Invalid user type',
            message: 'User type must be buyer, seller, or admin'
          });
      }

      // Find user
      const isEmailIdentifier = loginIdentifier.includes('@');
      const lookupQuery = isEmailIdentifier
        ? { email: loginIdentifier.toLowerCase() }
        : {
            $or: [
              { phone: loginIdentifier },
              { email: loginIdentifier.toLowerCase() }
            ]
          };
      user = await Model.findOne(lookupQuery).select('+password');

      console.log('Login attempt for:', loginIdentifier, 'User found:', !!user);
      if (user) {
        console.log('User password exists:', !!user.password);
        console.log('Password length:', user.password ? user.password.length : 'N/A');
      }

      if (!user) {
        // Log failed login attempt - user not found
        try {
          await AuditLog.create({
            action: 'LOGIN_ATTEMPT_INVALID_USER',
            actionType: 'login',
            module: 'auth',
            performedBy: null,
            userType: userType,
            targetResource: 'Authentication',
            description: `Failed login attempt - user not found for identifier: ${loginIdentifier}`,
            severity: 'medium',
            status: 'failure',
            session: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            },
            metadata: { 
              identifier: loginIdentifier, 
              reason: 'user_not_found',
              attemptTime: new Date()
            }
          });
        } catch (auditError) {
          logger.warn('Failed to log audit entry for invalid user', { error: auditError.message });
        }

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email/phone or password is incorrect'
        });
      }

      // Check password using the model's comparePassword method
      const isPasswordValid = await user.comparePassword(password);
      console.log('Password comparison result:', isPasswordValid);
      console.log('Provided password:', password);
      console.log('Stored password hash:', user.password);

      if (!isPasswordValid) {
        // Log failed login attempt - invalid password
        try {
          await AuditLog.create({
            action: 'LOGIN_ATTEMPT_INVALID_PASSWORD',
            actionType: 'login',
            module: 'auth',
            performedBy: user._id,
            userType: userType,
            targetResource: 'Authentication',
            targetId: user._id,
            description: `Failed login attempt - invalid password for user: ${loginIdentifier}`,
            severity: 'medium',
            status: 'failure',
            session: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            },
            metadata: { 
              identifier: loginIdentifier, 
              reason: 'invalid_password',
              attemptTime: new Date(),
              userId: user._id
            }
          });
        } catch (auditError) {
          logger.warn('Failed to log audit entry for invalid password', { error: auditError.message });
        }

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email/phone or password is incorrect'
        });
      }

      if (
        userType === 'buyer'
        && user
      ) {
        const sellerLookup = [];

        if (user.sellerProfile) {
          sellerLookup.push({ _id: user.sellerProfile });
        }

        if (user.email) {
          sellerLookup.push({ email: String(user.email).toLowerCase() });
        }

        if (user.phone) {
          sellerLookup.push({ phone: user.phone });
        }

        const linkedSeller = sellerLookup.length
          ? await Seller.findOne({ $or: sellerLookup })
          : null;

        if (linkedSeller) {
          if (!user.sellerProfile || String(user.sellerProfile) !== String(linkedSeller._id)) {
            user.isSeller = true;
            user.sellerProfile = linkedSeller._id;
            user.preferredUserType = 'seller';
            await user.save();
          }
          user = linkedSeller;
          resolvedUserType = 'seller';
        }
      }

      // Check account status
      if (user.isActive === false || user.status === 'suspended') {
        // Log suspended account login attempt
        try {
          await AuditLog.create({
            action: 'LOGIN_ATTEMPT_SUSPENDED_ACCOUNT',
            actionType: 'login',
            module: 'auth',
            performedBy: user._id,
            userType: userType,
            targetResource: 'Authentication',
            targetId: user._id,
            description: `Login attempt on suspended account for user: ${loginIdentifier}`,
            severity: 'high',
            status: 'failure',
            session: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            },
            metadata: { 
              identifier: loginIdentifier, 
              reason: 'account_suspended',
              attemptTime: new Date(),
              userId: user._id,
              accountStatus: user.accountStatus
            }
          });
        } catch (auditError) {
          logger.warn('Failed to log audit entry for suspended account', { error: auditError.message });
        }

        return res.status(403).json({
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated. Please contact support to reactivate.'
        });
      }

      // For sellers, check verification status
      // Temporarily bypassing verification check for testing
      /*
      if (userType === 'seller' && user.verificationStatus !== 'approved') {
        return res.status(403).json({
          error: 'Account not verified',
          message: 'Your seller account is pending verification. Please wait for approval.',
          verificationStatus: user.verificationStatus
        });
      }
      */

      // Update last login
      // ...
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const accessToken = generateToken(user._id, user.role || resolvedUserType, resolvedUserType);
      const refreshToken = generateRefreshToken(user._id, resolvedUserType);

      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Log successful login
      try {
        await AuditLog.create({
          action: 'USER_LOGIN_SUCCESS',
          actionType: 'login',
          module: 'auth',
          performedBy: user._id,
          userType: userType,
          targetResource: 'Authentication',
          targetId: user._id,
          description: `Successful login for user: ${loginIdentifier}`,
          severity: 'low',
          status: 'success',
          session: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          metadata: { 
            identifier: loginIdentifier, 
            loginTime: new Date(),
            userId: user._id,
            userType: resolvedUserType,
            lastLogin: user.lastLogin,
            lastLoginDate: user.lastLogin
          }
        });
      } catch (auditError) {
        logger.warn('Failed to log audit entry for successful login', { error: auditError.message });
      }

      res.json({
        message: 'Login successful',
        user: normalizeAuthUser(user, resolvedUserType),
        accessToken
      });

    } catch (error) {
      logger.error('Login error', error);
      
      try {
        await AuditLog.logAction({
          action: 'LOGIN_ERROR',
          userId: null,
          userType: req.body.userType || 'unknown',
          resourceType: 'Authentication',
          details: { error: error.message, identifier: req.body.identifier || req.body.email },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high',
          status: 'failure',
          actionType: 'login',
          module: 'auth'
        });
      } catch (auditError) {
        logger.warn('Failed to log audit entry for login error', { error: auditError.message });
      }

      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login. Please try again.'
      });
    }
  }
);

// Refresh Token
router.post('/refresh-token',
  refreshTokenLimiter,
  async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required',
          message: 'No refresh token provided'
        });
      }

      const decoded = verifyRefreshToken(refreshToken);
      
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid refresh token',
          message: 'Refresh token is invalid or expired'
        });
      }

      // Generate new tokens
      const accessToken = generateToken(decoded.id, decoded.role || 'user', decoded.userType);
      const newRefreshToken = generateRefreshToken(decoded.id, decoded.userType);

      // Set new refresh token cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        message: 'Token refreshed successfully',
        accessToken
      });

    } catch (error) {
      logger.error('Token refresh error', error);
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Unable to refresh token'
      });
    }
  }
);

// Upgrade a general buyer account into a seller account
router.post('/upgrade-to-seller',
  authenticate,
  authorizeUserType(['buyer']),
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('businessPhone')
    .trim()
    .notEmpty()
    .withMessage('Business phone is required')
    .matches(/^[+]?[0-9\s\-()]{7,15}$/)
    .withMessage('Please provide a valid business phone number'),
  body('businessEmail')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid business email address')
    .normalizeEmail()
    .toLowerCase(),
  body('businessType')
    .optional()
    .isIn(['individual', 'company', 'partnership'])
    .withMessage('Business type must be individual, company, or partnership'),
  body('isRegistered')
    .optional()
    .isBoolean()
    .withMessage('Registered status must be true or false')
    .toBoolean(),
  body('businessRegistrationNumber')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Business registration number must not exceed 50 characters'),
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        businessName,
        businessPhone,
        businessEmail,
        businessType = 'individual',
        businessDescription = '',
        businessAddress = {},
        isRegistered = false,
        businessRegistrationNumber = '',
        currentPassword
      } = req.body;

      const buyer = await User.findById(req.user.id).select('+password');
      if (!buyer) {
        return res.status(404).json({
          success: false,
          message: 'Buyer account not found'
        });
      }

      const isPasswordValid = await buyer.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const sellerEmail = normalizeOptionalEmail(businessEmail) || normalizeOptionalEmail(buyer.email);
      if (!sellerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Business email is required before becoming a seller'
        });
      }

      const duplicateChecks = [
        { email: sellerEmail },
        { phone: businessPhone }
      ];

      if (isRegistered && businessRegistrationNumber) {
        duplicateChecks.push({ businessRegistrationNumber: businessRegistrationNumber.trim() });
      }

      const existingSeller = await Seller.findOne({ $or: duplicateChecks });
      if (existingSeller) {
        return res.status(409).json({
          success: false,
          message: 'A seller account already exists with this email, phone, or registration number'
        });
      }

      const seller = new Seller({
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: sellerEmail,
        password: currentPassword,
        phone: businessPhone,
        businessName,
        businessType,
        businessDescription,
        businessRegistrationNumber: isRegistered ? businessRegistrationNumber.trim() : '',
        businessAddress,
        isVerified: buyer.isVerified === true,
        isEmailVerified: Boolean(buyer.isEmailVerified || buyer.isVerified),
        verificationStatus: 'pending',
        isActive: true,
        status: 'active',
        lastLogin: null
      });

      await seller.save();

      buyer.isSeller = true;
      buyer.sellerProfile = seller._id;
      buyer.preferredUserType = 'seller';
      await buyer.save();

      const accessToken = generateToken(seller._id, seller.role, 'seller');
      const refreshToken = generateRefreshToken(seller._id, 'seller');

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        message: 'Seller profile created successfully. You can now manage your store account.',
        user: normalizeAuthUser(seller, 'seller'),
        accessToken
      });
    } catch (error) {
      logger.error('Seller upgrade error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create seller profile'
      });
    }
  }
);

// Logout
router.post('/logout',
  authenticate,
  async (req, res) => {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      // Log logout
      try {
        await AuditLog.create({
          action: 'USER_LOGOUT',
          actionType: 'logout',
          module: 'auth',
          performedBy: req.user.id,
          userType: req.user.userType,
          targetResource: 'Authentication',
          targetId: req.user.id,
          description: `User logout for ${req.user.userType}: ${req.user.id}`,
          severity: 'low',
          status: 'success',
          session: {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          metadata: { 
            logoutTime: new Date(),
            userId: req.user.id,
            userType: req.user.userType
          }
        });
      } catch (auditError) {
        logger.warn('Failed to log audit entry for logout', { error: auditError.message });
      }

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error', error);
      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout'
      });
    }
  }
);

// Email Verification
router.post('/verify-email',
  body('token').notEmpty().withMessage('Verification token is required'),
  body('userType').isIn(['buyer', 'seller']).withMessage('Valid user type is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, userType } = req.body;

      const Model = userType === 'buyer' ? User : Seller;
      
      const user = await Model.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'Email verification token is invalid or has expired'
        });
      }

      user.isEmailVerified = true;
      if (userType === 'buyer') {
        user.isVerified = true;
      }
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      // Log email verification
      await AuditLog.logAction({
        action: 'EMAIL_VERIFIED',
        userId: user._id,
        userType,
        resourceType: 'User',
        resourceId: user._id,
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      // Send welcome email after verification, respecting notification preferences
      try {
        const optedOut = user.preferences && user.preferences.notifications === false;
        if (optedOut) {
          logger.info('User opted out of notifications; skipping welcome email', { userId: user._id, userType });
        } else {
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User';
          sendWelcomeEmail(user.email, fullName, userType)
            .then((result) => logger.info('Welcome email attempted after verification', { userId: user._id, userType, success: result.success, messageId: result.messageId }))
            .catch((err) => logger.error('Welcome email failed after verification', { userId: user._id, userType, error: err.message }));
        }
      } catch (e) {
        logger.error('Error in post-verification welcome email flow', { userId: user._id, error: e.message });
      }

      res.json({
        message: 'Email verified successfully',
        user: normalizeAuthUser(user, userType)
      });

    } catch (error) {
      logger.error('Email verification error', error);
      res.status(500).json({
        error: 'Email verification failed',
        message: 'An error occurred during email verification'
      });
    }
  }
);

// Request Password Reset
router.post('/forgot-password',
  strictAuthLimiter,
  validatePasswordReset,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, userType } = req.body;

      const Model = userType === 'buyer' ? User : 
                   userType === 'seller' ? Seller : Admin;
      
      const user = await Model.findOne({
        email
      });

      // Always return success to prevent email enumeration
      const successResponse = {
        message: 'Password reset instructions sent',
        note: 'If an account with this email exists, you will receive password reset instructions.'
      };

      if (!user) {
        // Temporarily disabled AuditLog to test password reset
        /*
        await AuditLog.logAction({
          action: 'PASSWORD_RESET_ATTEMPT_INVALID_EMAIL',
          userId: null,
          userType,
          resourceType: 'Authentication',
          details: { email, reason: 'user_not_found' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'low'
        });
        */

        return res.json(successResponse);
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');

      if (userType === 'admin') {
        user.set('security.passwordResetToken', resetToken);
        user.set('security.passwordResetExpires', new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
      } else {
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      }

      await user.save();

      // Send reset email
      try {
        await sendPasswordResetEmail(
          email,
          `${user.firstName} ${user.lastName}`,
          resetToken,
          userType
        );

        // Temporarily disabled AuditLog to test password reset
        /*
        await AuditLog.logAction({
          action: 'PASSWORD_RESET_REQUESTED',
          userId: user._id,
          userType,
          resourceType: 'Authentication',
          resourceId: user._id,
          details: { email },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
        */

      } catch (emailError) {
        logger.error('Failed to send password reset email', emailError);
      }

      res.json(successResponse);

    } catch (error) {
      logger.error('Password reset request error', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while processing your request'
      });
    }
  }
);

// Reset Password
router.post('/reset-password',
  strictAuthLimiter,
  body('token').notEmpty().withMessage('Reset token is required'),
  body('userType').isIn(['buyer', 'seller', 'admin']).withMessage('Valid user type is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, password, userType } = req.body;

      // Select model and lookup by token location
      let user;
      if (userType === 'admin') {
        user = await Admin.findOne({
          'security.passwordResetToken': token,
          'security.passwordResetExpires': { $gt: new Date() }
        }).select('+password');
      } else if (userType === 'seller') {
        user = await Seller.findOne({
          passwordResetToken: token,
          passwordResetExpires: { $gt: new Date() }
        }).select('+password');
      } else {
        // buyer
        user = await User.findOne({
          passwordResetToken: token,
          passwordResetExpires: { $gt: new Date() }
        }).select('+password');
      }

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'Password reset token is invalid or has expired'
        });
      }

      // Set new password (will be hashed by model middleware)
      user.password = password;

      if (userType === 'admin') {
        user.set('security.passwordResetToken', undefined);
        user.set('security.passwordResetExpires', undefined);
        user.set('security.lastPasswordChange', new Date());
      } else {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
      }

      await user.save();

      // Log password reset
      await AuditLog.logAction({
        action: 'PASSWORD_RESET_COMPLETED',
        performedBy: user._id,
        userType: (userType === 'buyer' ? 'user' : userType),
        userModel: (userType === 'admin' ? 'Admin' : userType === 'seller' ? 'Seller' : 'User'),
        targetResource: 'Authentication',
        targetId: user._id,
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: 'Password reset successful',
        note: 'You can now login with your new password'
      });

    } catch (error) {
      logger.error('Password reset error', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while resetting your password'
      });
    }
  }
);

// Admin: Directly reset a user's password (no email link)
router.post('/admin/reset-user-password',
  authenticate,
  body('userId').notEmpty().withMessage('User ID is required'),
  body('userType').isIn(['buyer', 'seller', 'admin']).withMessage('Valid user type is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  handleValidationErrors,
  async (req, res) => {
    try {
      // Require admin privileges
      if (!req.user || req.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId, userType, password } = req.body;

      const Model = userType === 'buyer' ? User : userType === 'seller' ? Seller : Admin;
      const tokenSelector = userType === 'admin' ? 'security.passwordResetToken' : 'passwordResetToken';

      const user = await Model.findById(userId).select('+password');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update password; model pre-save hooks will hash it
      user.password = password;

      // Clear any existing reset token state
      if (userType === 'admin') {
        user.set('security.passwordResetToken', undefined);
        user.set('security.passwordResetExpires', undefined);
        user.set('security.lastPasswordChange', new Date());
      } else {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
      }

      await user.save();

      // Audit log
      await AuditLog.logAction({
        action: 'ADMIN_MANUAL_PASSWORD_RESET',
        performedBy: req.user.id,
        userType: 'admin',
        userModel: 'Admin',
        targetResource: 'Authentication',
        targetId: user._id,
        details: { targetUserId: user._id, targetUserType: userType },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high',
        status: 'success'
      });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      logger.error('Admin manual password reset error', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  }
);

// Get Current User
router.get('/me',
  authenticate,
  async (req, res) => {
    try {
      const userType = req.userType;
      const id = req.user?.id || req.user?._id?.toString?.();
      
      const Model = userType === 'buyer' ? User : 
                   userType === 'seller' ? Seller : Admin;
      
      const user = await Model.findById(id).select('-password');

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account no longer exists'
        });
      }

      res.json({
        user: normalizeAuthUser(user, userType)
      });

    } catch (error) {
      logger.error('Get current user error', error);
      res.status(500).json({
        error: 'Failed to fetch user data',
        message: 'An error occurred while fetching user information'
      });
    }
  }
);

module.exports = router;
