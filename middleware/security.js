const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const ExpressBrute = require('express-brute');
const MongoStore = require('express-brute-mongo');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');

/**
 * Basic security headers using Helmet
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://via.placeholder.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.flutterwave.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * General API rate limiting
 */
const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || req.path.startsWith('/static/');
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user ? `user_${req.user._id}` : req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: req.user ? req.user._id : null
    });
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authRateLimit = rateLimit({
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
 * Slow down middleware for repeated requests
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skip: (req) => {
    return req.path === '/health' || req.path.startsWith('/static/');
  }
});

/**
 * Brute force protection for login attempts
 */
const createBruteForceProtection = () => {
  const store = new MongoStore((ready) => {
    ready(mongoose.connection.collection('bruteforce'));
  });

  const bruteforce = new ExpressBrute(store, {
    freeRetries: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    minWait: 5 * 60 * 1000, // 5 minutes
    maxWait: parseInt(process.env.LOCKOUT_TIME_HOURS) * 60 * 60 * 1000 || 2 * 60 * 60 * 1000, // 2 hours
    lifetime: 24 * 60 * 60, // 24 hours (seconds)
    failCallback: (req, res, next, nextValidRequestDate) => {
      const message = `Too many failed attempts. Try again ${new Date(nextValidRequestDate).toLocaleString()}`;
      
      logger.warn('Brute force protection triggered', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body.email,
        nextValidRequestDate
      });

      res.status(429).json({
        success: false,
        message,
        nextValidRequestDate
      });
    },
    handleStoreError: (error) => {
      logger.error('Brute force store error', { error: error.message });
      throw error;
    }
  });

  return {
    prevent: bruteforce.prevent,
    reset: (req, res, next) => {
      if (req.user) {
        // Reset brute force counter on successful login
        bruteforce.reset(req.ip, () => {
          next();
        });
      } else {
        next();
      }
    }
  };
};

/**
 * MongoDB injection protection
 */
const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('MongoDB injection attempt detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      key,
      path: req.path,
      method: req.method
    });
  }
});

/**
 * XSS protection
 */
const xssProtection = xss({
  onSanitize: (key, value, req) => {
    logger.warn('XSS attempt detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      key,
      value: value.substring(0, 100), // Log first 100 chars only
      path: req.path,
      method: req.method
    });
  }
});

/**
 * HTTP Parameter Pollution protection
 */
const parameterPollutionProtection = hpp({
  whitelist: ['tags', 'categories', 'colors', 'sizes'] // Allow arrays for these parameters
});

/**
 * IP whitelist middleware for admin routes
 */
const ipWhitelist = (req, res, next) => {
  if (req.user && req.user.security && req.user.security.ipWhitelist && req.user.security.ipWhitelist.length > 0) {
    const clientIP = req.ip;
    const allowedIPs = req.user.security.ipWhitelist;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP not in whitelist', {
        userId: req.user._id,
        clientIP,
        allowedIPs,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied. Your IP address is not whitelisted.'
      });
    }
  }
  
  next();
};

/**
 * Session security middleware
 */
const sessionSecurity = (req, res, next) => {
  if (req.user && req.session) {
    // Check for session hijacking
    const currentUserAgent = req.get('User-Agent');
    const sessionUserAgent = req.session.userAgent;
    
    if (sessionUserAgent && sessionUserAgent !== currentUserAgent) {
      logger.warn('Potential session hijacking detected', {
        userId: req.user._id,
        sessionUserAgent,
        currentUserAgent,
        ip: req.ip
      });

      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'Session security violation detected. Please log in again.'
      });
    }

    // Store user agent in session
    if (!sessionUserAgent) {
      req.session.userAgent = currentUserAgent;
    }

    // Update last activity
    req.session.lastActivity = new Date();
  }
  
  next();
};

/**
 * CORS security middleware
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS violation', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,  // Event handler injection
    /onerror=/i  // Error handler injection
  ];

  const requestData = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));

  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers
    });
  }

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log failed authentication attempts
    if (req.path.includes('/auth/') && (!data.success || res.statusCode >= 400)) {
      logger.warn('Failed authentication attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        email: req.body.email
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * File upload security middleware
 */
const fileUploadSecurity = (req, res, next) => {
  if (req.file || req.files) {
    const files = req.files || [req.file];
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',');
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        logger.warn('Unauthorized file type upload attempt', {
          ip: req.ip,
          userId: req.user ? req.user._id : null,
          filename: file.originalname,
          mimetype: file.mimetype,
          allowedTypes
        });

        return res.status(400).json({
          success: false,
          message: 'File type not allowed'
        });
      }

      // Check file size
      if (file.size > maxSize) {
        logger.warn('File size limit exceeded', {
          ip: req.ip,
          userId: req.user ? req.user._id : null,
          filename: file.originalname,
          size: file.size,
          maxSize
        });

        return res.status(400).json({
          success: false,
          message: 'File size too large'
        });
      }

      // Check for malicious file names
      const maliciousPatterns = [
        /\.\./,  // Directory traversal
        /[<>:"|?*]/,  // Invalid characters
        /\.(exe|bat|cmd|scr|pif|com)$/i  // Executable files
      ];

      if (maliciousPatterns.some(pattern => pattern.test(file.originalname))) {
        logger.warn('Malicious filename detected', {
          ip: req.ip,
          userId: req.user ? req.user._id : null,
          filename: file.originalname
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }
    }
  }

  next();
};

/**
 * API key validation middleware
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  // In production, validate against database
  const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key used', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      apiKey: apiKey.substring(0, 8) + '...' // Log only first 8 characters
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
};

/**
 * Initialize brute force protection
 */
const bruteForce = createBruteForceProtection();

module.exports = {
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  speedLimiter,
  bruteForce,
  mongoSanitization,
  xssProtection,
  parameterPollutionProtection,
  ipWhitelist,
  sessionSecurity,
  corsOptions,
  securityLogger,
  fileUploadSecurity,
  validateApiKey
};