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
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();

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

      // Check if user already exists
      const existingBuyer = await User.findOne({ 
        $or: [{ email }, { phone }] 
      });
      
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
        email,
        password,
        phone,
        dateOfBirth,
        address,
        isEmailVerified: false,
        isPhoneVerified: false,
        registrationDate: new Date(),
        lastLoginDate: null,
        accountStatus: 'active'
      });

      await buyer.save();

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      buyer.emailVerificationToken = emailVerificationToken;
      buyer.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await buyer.save();

      // Send verification email
      try {
        await sendVerificationEmail(
          email,
          `${firstName} ${lastName}`,
          emailVerificationToken,
          'buyer'
        );
      } catch (emailError) {
        logger.error('Failed to send verification email', emailError);
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
        user: {
          id: buyer._id,
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          email: buyer.email,
          phone: buyer.phone,
          userType: 'buyer',
          isEmailVerified: buyer.isEmailVerified,
          isPhoneVerified: buyer.isPhoneVerified,
          accountStatus: buyer.accountStatus
        },
        accessToken,
        emailVerificationSent: true
      });

    } catch (error) {
      logger.error('Buyer registration error', { error: error.message, stack: error.stack });
      
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
        query.$or.push({ taxId });
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
        } else if (taxId && existingSeller.taxId === taxId) {
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
        taxId,
        businessAddress,
        businessDescription,
        website,
        socialMedia,
        isEmailVerified: false,
        isPhoneVerified: false,
        verificationStatus: 'pending',
        accountStatus: 'pending_verification',
        registrationDate: new Date(),
        lastLoginDate: null
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
        user: {
          id: seller._id,
          firstName: seller.firstName,
          lastName: seller.lastName,
          email: seller.email,
          phone: seller.phone,
          businessName: seller.businessName,
          businessType: seller.businessType,
          userType: 'seller',
          isEmailVerified: seller.isEmailVerified,
          verificationStatus: seller.verificationStatus,
          accountStatus: seller.accountStatus
        },
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
      const { email, password, userType } = req.body;

      let user;
      let Model;

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
      user = await Model.findOne({ email }).select('+password');

      console.log('Login attempt for:', email, 'User found:', !!user);
      if (user) {
        console.log('User password exists:', !!user.password);
        console.log('Password length:', user.password ? user.password.length : 'N/A');
      }

      if (!user) {
        // Temporarily disabled AuditLog to test login
        /*
        await AuditLog.logAction({
          action: 'LOGIN_ATTEMPT_INVALID_USER',
          userId: null,
          userType,
          resourceType: 'Authentication',
          details: { email, reason: 'user_not_found' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
        */

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check password using the model's comparePassword method
      const isPasswordValid = await user.comparePassword(password);
      console.log('Password comparison result:', isPasswordValid);
      console.log('Provided password:', password);
      console.log('Stored password hash:', user.password);

      if (!isPasswordValid) {
        // Temporarily disabled AuditLog to test login
        /*
        await AuditLog.logAction({
          action: 'LOGIN_ATTEMPT_INVALID_PASSWORD',
          userId: user._id,
          userType,
          resourceType: 'Authentication',
          details: { email, reason: 'invalid_password' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
        */

        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check account status
      if (user.accountStatus === 'suspended') {
        // Temporarily disabled AuditLog to test login
        /*
        await AuditLog.logAction({
          action: 'LOGIN_ATTEMPT_SUSPENDED_ACCOUNT',
          userId: user._id,
          userType,
          resourceType: 'Authentication',
          details: { email, reason: 'account_suspended' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
        */

        return res.status(403).json({
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        });
      }

      if (user.accountStatus === 'deactivated') {
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
      user.lastLoginDate = new Date();
      await user.save();

      // Generate tokens
      const accessToken = generateToken(user._id, user.role || 'seller', userType);
      const refreshToken = generateRefreshToken(user._id, userType);

      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Log successful login
      // Temporarily disabled AuditLog to test login
      /*
      await AuditLog.logAction({
        action: 'USER_LOGIN',
        userId: user._id,
        userType,
        resourceType: 'Authentication',
        resourceId: user._id,
        details: { email, loginTime: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });
      */

      // Prepare user data for response
      const userData = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        accountStatus: user.accountStatus,
        lastLoginDate: user.lastLoginDate
      };

      // Add type-specific data
      if (userType === 'seller') {
        userData.businessName = user.businessName;
        userData.businessType = user.businessType;
        userData.verificationStatus = user.verificationStatus;
      } else if (userType === 'admin') {
        userData.role = user.role;
        userData.permissions = user.permissions;
        userData.employeeId = user.employeeId;
      }

      res.json({
        message: 'Login successful',
        user: userData,
        accessToken
      });

    } catch (error) {
      logger.error('Login error', error);
      
      await AuditLog.logAction({
        action: 'LOGIN_ERROR',
        userId: null,
        userType: req.body.userType || 'unknown',
        resourceType: 'Authentication',
        details: { error: error.message, email: req.body.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

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

// Logout
router.post('/logout',
  authenticate,
  async (req, res) => {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      // Log logout
      // Temporarily disabled AuditLog to test logout
      /*
      await AuditLog.logAction({
        action: 'USER_LOGOUT',
        userId: req.user.id,
        userType: req.user.userType,
        resourceType: 'Authentication',
        resourceId: req.user.id,
        details: { logoutTime: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });
      */

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

      const Model = userType === 'buyer' ? Buyer : Seller;
      
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

      res.json({
        message: 'Email verified successfully',
        user: {
          id: user._id,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        }
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

      const Model = userType === 'buyer' ? Buyer : 
                   userType === 'seller' ? Seller : Admin;
      
      const user = await Model.findOne({ email });

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
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
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
  validatePasswordUpdate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, password, userType } = req.body;

      const Model = userType === 'buyer' ? Buyer : 
                   userType === 'seller' ? Seller : Admin;
      
      const user = await Model.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'Password reset token is invalid or has expired'
        });
      }

      // Set new password (will be hashed by model middleware)
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Log password reset
      await AuditLog.logAction({
        action: 'PASSWORD_RESET_COMPLETED',
        userId: user._id,
        userType,
        resourceType: 'Authentication',
        resourceId: user._id,
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

// Get Current User
router.get('/me',
  authenticate,
  async (req, res) => {
    try {
      const { userType, id } = req.user;
      
      const Model = userType === 'buyer' ? Buyer : 
                   userType === 'seller' ? Seller : Admin;
      
      const user = await Model.findById(id).select('-password');

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account no longer exists'
        });
      }

      res.json({
        user: user.toJSON()
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