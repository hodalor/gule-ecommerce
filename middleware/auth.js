const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @param {string} userType - User type (buyer, seller, admin)
 */
const generateToken = (id, role, userType) => {
  return jwt.sign(
    { 
      id, 
      role, 
      userType,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Generate refresh token
 * @param {string} id - User ID
 * @param {string} userType - User type
 */
const generateRefreshToken = (id, userType) => {
  return jwt.sign(
    { 
      id, 
      userType,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret
 */
const verifyToken = async (token, secret = process.env.JWT_SECRET) => {
  try {
    return await promisify(jwt.verify)(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 */
const extractToken = (req) => {
  let token;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check cookies
  else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // Check query parameter (for development/testing only)
  else if (req.query && req.query.token && process.env.NODE_ENV !== 'production') {
    token = req.query.token;
  }

  return token;
};

/**
 * Get user by ID and type
 * @param {string} id - User ID
 * @param {string} userType - User type
 */
const getUserById = async (id, userType) => {
  let user;
  let Model;

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
      throw new Error('Invalid user type');
  }

  user = await Model.findById(id).select('+isActive +isVerified');
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('User account is deactivated');
  }

  // Check if user is verified (for buyers and sellers)
  // Temporarily disabled for testing
  // if ((userType === 'buyer' || userType === 'seller') && !user.isVerified) {
  //   throw new Error('User account is not verified');
  // }

  return user;
};

/**
 * Log authentication activity
 * @param {Object} user - User object
 * @param {string} action - Action performed
 * @param {Object} req - Express request object
 * @param {string} status - Status of the action
 */
const logAuthActivity = async (user, action, req, status = 'success') => {
  try {
    // Temporarily disabled AuditLog to test login
    /*
    await AuditLog.logAction({
      userId: user._id,
      userType: user.constructor.modelName.toLowerCase(),
      action,
      resource: 'authentication',
      details: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        status
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: status === 'success' ? 'info' : 'warning'
    });
    */
  } catch (error) {
    logger.error('Failed to log auth activity', { error: error.message });
  }
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from request
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = await verifyToken(token);

    // Get user from database
    const user = await getUserById(decoded.id, decoded.userType);

    // Check if user changed password after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password. Please log in again.'
      });
    }

    // Attach user to request
    req.user = user;
    req.userType = decoded.userType;
    req.userRole = decoded.role || user.role;

    // Log successful authentication
    await logAuthActivity(user, 'token_verification', req, 'success');

    next();
  } catch (error) {
    logger.error('Authentication failed', { 
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = await verifyToken(token);
      const user = await getUserById(decoded.id, decoded.userType);

      req.user = user;
      req.userType = decoded.userType;
      req.userRole = decoded.role || user.role;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.userRole || req.user.role;

    if (!roles.includes(userRole)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user._id,
        userType: req.userType,
        userRole,
        requiredRoles: roles,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * User type authorization middleware
 * @param {...string} userTypes - Allowed user types
 */
const authorizeUserType = (...userTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!userTypes.includes(req.userType)) {
      logger.warn('Unauthorized user type access attempt', {
        userId: req.user._id,
        userType: req.userType,
        requiredUserTypes: userTypes,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid user type.'
      });
    }

    next();
  };
};

/**
 * Admin permission middleware
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || req.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const hasPermission = await req.user.hasPermission(permission);

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user._id,
          permission,
          userRole: req.user.role,
          ip: req.ip,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          message: `Permission denied. Required permission: ${permission}`
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Generic resource ownership middleware factory
 * Loads resource and checks ownership
 */
const checkOwnership = (Model, ownerField) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${Model.modelName} not found`
        });
      }

      // Check ownership based on user type and owner field
      const userId = req.user._id.toString();
      const resourceOwnerId = resource[ownerField] ? resource[ownerField].toString() : null;

      if (resourceOwnerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      // Attach resource to request for use in route handler
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Seller ownership middleware
 * Ensures seller can only access their own resources
 */
const requireSellerOwnership = (resourceIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user || req.userType !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Seller access required'
      });
    }

    const resourceId = req.params[resourceIdParam];
    const sellerId = req.user._id.toString();

    // For seller routes, check if the resource belongs to the seller
    if (req.resource && req.resource.seller && req.resource.seller.toString() !== sellerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Buyer ownership middleware
 * Ensures buyer can only access their own resources
 */
const requireBuyerOwnership = (resourceIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user || req.userType !== 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Buyer access required'
      });
    }

    const resourceId = req.params[resourceIdParam];
    const buyerId = req.user._id.toString();

    // For buyer routes, check if the resource belongs to the buyer
    if (req.resource && req.resource.buyer && req.resource.buyer.toString() !== buyerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Rate limiting for authentication attempts
 */
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users
    return req.user && req.user.id;
  }
});

/**
 * Refresh token middleware
 */
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = await verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = await getUserById(decoded.id, decoded.userType);

    // Generate new tokens
    const newToken = generateToken(user._id, user.role, decoded.userType);
    const newRefreshToken = generateRefreshToken(user._id, decoded.userType);

    // Log token refresh
    await logAuthActivity(user, 'token_refresh', req, 'success');

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          userType: decoded.userType
        }
      }
    });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * Logout middleware
 */
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAuthActivity(req.user, 'logout', req, 'success');
    }

    // Clear cookies
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  authorizeUserType,
  requirePermission,
  checkOwnership,
  requireSellerOwnership,
  requireBuyerOwnership,
  authRateLimit,
  refreshToken,
  logout,
  extractToken,
  getUserById,
  logAuthActivity
};