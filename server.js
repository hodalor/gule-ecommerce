const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const fileUpload = require('express-fileupload');
const path = require('path');
const winston = require('winston');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('winston-mongodb');
require('express-async-errors');

// Load environment variables
require('dotenv').config();

// Import configurations and utilities
const { initializeDatabase, closeDatabase, getDatabaseHealth } = require('./config/database');
const { AuditLog } = require('./models');

// Import middleware
const { corsOptions, securityLogger, fileUploadSecurity } = require('./middleware/security');
const { handleValidationErrors } = require('./middleware/validation');
const { authenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const sellerRoutes = require('./routes/sellers');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminUserRoutes = require('./routes/adminUsers');
const adminOrderRoutes = require('./routes/adminOrders');
const adminRoutes = require('./routes/admin');
const adminProductRoutes = require('./routes/adminProducts');
const adminSellerRoutes = require('./routes/adminSellers');
const adminReviewRoutes = require('./routes/adminReviews');
const adminCategoryRoutes = require('./routes/adminCategories');
const adminDisputeRoutes = require('./routes/adminDisputes');
const adminAuditLogRoutes = require('./routes/adminAuditLogs');
const adminServerLogRoutes = require('./routes/adminServerLogs');
const escrowRoutes = require('./routes/escrow');
const reviewRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');
const notificationsRoutes = require('./routes/notifications');
const complaintsRoutes = require('./routes/complaints');
const refundsRoutes = require('./routes/refunds');
const inventoryRoutes = require('./routes/inventory');
const sessionsRoutes = require('./routes/sessions');
const financeRoutes = require('./routes/finance');
const addressRoutes = require('./routes/addresses');
const transactionRoutes = require('./routes/transactions');

// Import error handler and logger
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Create Express app
const app = express();
// Disable ETag to avoid 304 Not Modified on API responses
app.set('etag', false);
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL],
    methods: ['GET', 'POST']
  }
});

logger.info('Socket.IO initialized', {
  origins: [process.env.FRONTEND_URL, process.env.ADMIN_URL]
});

// Make io accessible to routes
app.set('io', io);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.flutterwave.com"]
    }
  }
}));

app.use(compression());
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_JSON_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'gule.sid'
}));

// Security middleware
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'tags', 'price']
}));

// File upload middleware
app.use(fileUpload({
  limits: { 
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB
  },
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded',
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'temp'),
  createParentPath: true,
  parseNested: true
}));


// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for super_admin users (god mode)
    return req.user && req.user.role === 'super_admin';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      userId: req.user?.id || null,
      userRole: req.user?.role || null
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

app.use('/api/', generalLimiter);

// Disable client caching for API responses to ensure JSON body is returned
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null
    };

    if (res.statusCode >= 400) {
      logger.error('HTTP Error', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
});

// Security logging middleware
app.use(securityLogger);

// File upload security middleware
app.use('/api/upload', fileUploadSecurity);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
// Mount specific admin routes before the general admin route
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/sellers', adminSellerRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/disputes', adminDisputeRoutes);
app.use('/api/admin/audit-logs', adminAuditLogRoutes);
app.use('/api/admin/server-logs', adminServerLogRoutes);
// General admin route must come last to avoid conflicts
app.use('/api/admin', adminRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/transactions', transactionRoutes);

// Swagger documentation
if (process.env.NODE_ENV === 'development') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');
  
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Gule Marketplace API',
        version: '1.0.0',
        description: 'Multi-vendor e-commerce marketplace API with escrow system',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 8000}`,
        },
      ],
    },
    apis: ['./routes/*.js', './models/*.js'],
  };
  
  const specs = swaggerJsdoc(options);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await getDatabaseHealth();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs-info', (req, res) => {
  res.json({
    name: 'Gule Multi-Vendor E-commerce API',
    version: '1.0.0',
    description: 'RESTful API for multi-vendor e-commerce marketplace',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      sellers: '/api/sellers',
      products: '/api/products',
      orders: '/api/orders',
      admin: '/api/admin',
      escrow: '/api/escrow',
      reviews: '/api/reviews',
      settings: '/api/settings'
    },
    documentation: '/api/docs'
  });
});

// WebSocket connection handling for real-time features
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Handle authentication for WebSocket
  socket.on('authenticate', (token) => {
    try {
      // You can add JWT verification here if needed
      socket.authenticated = true;
      socket.emit('authenticated', { success: true });
      logger.info(`Socket ${socket.id} authenticated`);
    } catch (error) {
      socket.emit('authentication_error', { error: 'Invalid token' });
      logger.warn(`Socket ${socket.id} authentication failed`);
    }
  });
  
  // Join admin room for real-time updates
  socket.on('join_admin', () => {
    if (socket.authenticated) {
      socket.join('admin_room');
      socket.emit('joined_admin', { success: true });
      logger.info(`Socket ${socket.id} joined admin room`);
    } else {
      socket.emit('join_error', { error: 'Not authenticated' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Function to emit real-time log updates
const emitLogUpdate = (logData) => {
  io.to('admin_room').emit('log_update', logData);
};

// Function to emit real-time audit log updates
const emitAuditLogUpdate = (auditData) => {
  io.to('admin_room').emit('audit_log_update', auditData);
};

// Make these functions available globally
global.emitLogUpdate = emitLogUpdate;
global.emitAuditLogUpdate = emitAuditLogUpdate;

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id || null
  });

  // Log to audit system for security-related errors
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.code === 11000) {
    // Temporarily disabled AuditLog to test login
    /*
    AuditLog.logAction({
      action: 'VALIDATION_ERROR',
      userId: req.user?.id || null,
      userType: req.user?.userType || 'unknown',
      resourceType: 'API',
      resourceId: req.originalUrl,
      details: {
        error: error.message,
        method: req.method,
        body: req.body
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'medium'
    }).catch(logError => {
      logger.error('Failed to log audit entry', logError);
    });
    */
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { 
      details: error.message,
      stack: error.stack 
    }),
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
});

// Error handling middleware (keep existing for compatibility)
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // Join user to their specific room
  socket.on('join', (userId) => {
    socket.join(userId);
    logger.info(`User ${userId} joined their room`);
  });
  
  // Handle admin room joining
  socket.on('join-admin', (adminId) => {
    socket.join('admin-room');
    socket.join(adminId);
    logger.info(`Admin ${adminId} joined admin room`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await closeDatabase();
    logger.info('Database connection closed');
    
    // Close server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
    
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason });
  // Keep server running; log and continue. Consider monitoring to restart if needed.
});

// Start server
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

let serverInstance;

const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    // Start HTTP server
    serverInstance = server.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
      logger.info(`API docs info: http://${HOST}:${PORT}/api/docs-info`);
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API Documentation: http://${HOST}:${PORT}/api/docs`);
      }
      logger.info('Socket.IO ready (attached to HTTP server)');
    });
    
    // Handle server errors
    serverInstance.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error', error);
      }
      gracefulShutdown('server_error');
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    await gracefulShutdown('startup_error');
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

// Graceful shutdown (updated to use serverInstance)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (serverInstance) {
    serverInstance.close(async () => {
      try {
        await closeDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing database', error);
        process.exit(1);
      }
    });
  }
});

module.exports = app;