const database = require('../utils/database');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Database configuration based on environment
const config = {
  development: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gule_marketplace_dev',
    options: {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority',
      bufferCommands: false,
      family: 4
    }
  },
  
  test: {
    uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/gule_marketplace_test',
    options: {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,
      heartbeatFrequencyMS: 5000,
      maxIdleTimeMS: 15000,
      retryWrites: true,
      w: 'majority'
    }
  },
  
  production: {
    uri: process.env.MONGODB_URI,
    options: {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 30000,
      maxIdleTimeMS: 60000,
      retryWrites: true,
      w: 'majority',
      readPreference: 'secondaryPreferred',
      compressors: ['zlib'],
      zlibCompressionLevel: 6
    }
  }
};

/**
 * Initialize database connection
 */
async function initializeDatabase() {
  try {
    const env = process.env.NODE_ENV || 'development';
    const dbConfig = config[env];
    
    if (!dbConfig) {
      throw new Error(`Database configuration not found for environment: ${env}`);
    }

    logger.info(`Initializing database for ${env} environment`);
    
    // Connect to database
    await database.connect(dbConfig.uri, dbConfig.options);

    // Attach MongoDB log transport to active mongoose connection (safe, lazy)
    try {
      logger.attachMongoTransport(mongoose.connection);
    } catch (e) {
      logger.warn('Skipping MongoDB log transport attachment', { error: e.message });
    }
    
    // Load all models to ensure they are registered
    require('../models/User');
    require('../models/Seller');
    require('../models/Product');
    require('../models/Order');
    require('../models/OrderItem');
    require('../models/Escrow');
    require('../models/Admin');
    require('../models/ReviewAssignment');
    require('../models/AdminSettings');
    require('../models/AuditLog');
    
    // Create indexes for better performance
    // Run index creation in background to avoid blocking startup
    database.createIndexes()
      .then(() => logger.info('Index creation completed'))
      .catch(e => logger.warn('Index creation skipped due to error', { error: e.message }));

    // Initialize default data (only in development and production)
    if (env !== 'test') {
      await database.initializeDefaults();
    }
    
    logger.info('Database initialization completed successfully');
    
    return database;
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    await database.disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    throw error;
  }
}

/**
 * Get database health status
 */
function getDatabaseHealth() {
  return database.testConnection();
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  return database.getStats();
}

/**
 * Get collection information
 */
async function getCollectionInfo() {
  return database.getCollectionInfo();
}

/**
 * Perform database cleanup
 */
async function performCleanup() {
  return database.cleanup();
}

/**
 * Backup database
 */
async function backupDatabase(backupPath) {
  return database.backup(backupPath);
}

/**
 * Restore database
 */
async function restoreDatabase(backupPath) {
  return database.restore(backupPath);
}

module.exports = {
  config,
  database,
  initializeDatabase,
  closeDatabase,
  getDatabaseHealth,
  getDatabaseStats,
  getCollectionInfo,
  performCleanup,
  backupDatabase,
  restoreDatabase
};