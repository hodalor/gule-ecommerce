const mongoose = require('mongoose');
const logger = require('./logger');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB database
   * @param {string} uri - MongoDB connection URI
   * @param {object} options - Connection options
   */
  async connect(uri = process.env.MONGODB_URI, options = {}) {
    try {
      // Default connection options
      const defaultOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 5, // Maintain up to 5 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
        bufferCommands: false, // Disable mongoose buffering
        connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
        heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        retryWrites: true,
        w: 'majority',
        ...options
      };

      // Validate URI
      if (!uri) {
        throw new Error('MongoDB URI is required');
      }

      logger.info('Attempting to connect to MongoDB...', {
        uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials in logs
        options: defaultOptions
      });

      // Connect to MongoDB
      this.connection = await mongoose.connect(uri, defaultOptions);
      this.isConnected = true;
      this.connectionAttempts = 0;

      logger.info('Successfully connected to MongoDB', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });

      // Set up connection event listeners
      this.setupEventListeners();

      return this.connection;
    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;

      logger.error('Failed to connect to MongoDB', {
        error: error.message,
        attempt: this.connectionAttempts,
        maxRetries: this.maxRetries
      });

      // Retry connection if within retry limit
      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`Retrying connection in ${this.retryDelay / 1000} seconds...`);
        await this.delay(this.retryDelay);
        return this.connect(uri, options);
      }

      throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection && this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isHealthy() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  getStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      status: states[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name
    };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isHealthy()) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const stats = await db.stats();
      const collections = await db.listCollections().toArray();

      return {
        database: mongoose.connection.name,
        collections: collections.length,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        indexes: stats.indexes
      };
    } catch (error) {
      logger.error('Error getting database stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    // Connection successful
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    // Connection error
    mongoose.connection.on('error', (error) => {
      logger.error('Mongoose connection error', { error: error.message });
      this.isConnected = false;
    });

    // Connection disconnected
    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Connection reconnected
    mongoose.connection.on('reconnected', () => {
      logger.info('Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Connection timeout
    mongoose.connection.on('timeout', () => {
      logger.warn('Mongoose connection timeout');
    });

    // Connection close
    mongoose.connection.on('close', () => {
      logger.info('Mongoose connection closed');
      this.isConnected = false;
    });

    // Process termination handlers
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGUSR2', this.gracefulShutdown.bind(this)); // Nodemon restart
  }

  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Gracefully shutting down database connection...`);
    
    try {
      await this.disconnect();
      logger.info('Database connection closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Create database indexes for better performance
   */
  async createIndexes() {
    try {
      logger.info('Creating database indexes...');

      // User indexes
      await mongoose.model('User').createIndexes();
      
      // Seller indexes
      await mongoose.model('Seller').createIndexes();
      
      // Product indexes
      await mongoose.model('Product').createIndexes();
      
      // Order indexes
      await mongoose.model('Order').createIndexes();
      
      // OrderItem indexes
      await mongoose.model('OrderItem').createIndexes();
      
      // Escrow indexes
      await mongoose.model('Escrow').createIndexes();
      
      // Admin indexes
      await mongoose.model('Admin').createIndexes();
      
      // ReviewAssignment indexes
      await mongoose.model('ReviewAssignment').createIndexes();
      
      // AdminSettings indexes
      await mongoose.model('AdminSettings').createIndexes();
      
      // AuditLog indexes
      await mongoose.model('AuditLog').createIndexes();

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating database indexes', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize default data
   */
  async initializeDefaults() {
    try {
      logger.info('Initializing default data...');

      // Create default admin user if none exists
      const Admin = mongoose.model('Admin');
      const adminCount = await Admin.countDocuments();
      
      if (adminCount === 0) {
        // Generate employee ID for default admin
        const currentYear = new Date().getFullYear();
        const employeeId = `GULE${currentYear}0001`;
        
        const defaultAdmin = new Admin({
          employeeId: employeeId,
          firstName: process.env.DEFAULT_ADMIN_FIRST_NAME || 'Super',
          lastName: process.env.DEFAULT_ADMIN_LAST_NAME || 'Admin',
          email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@gule.com',
          password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!@#',
          role: 'super_admin',
          department: 'administration',
          jobTitle: 'System Administrator',
          phone: process.env.DEFAULT_ADMIN_PHONE || '+260123456789',
          address: {
            street: '123 Admin Street',
            city: 'Lusaka',
            state: 'Lusaka Province',
            zipCode: '10101',
            country: 'Zambia'
          },
          employment: {
            hireDate: new Date(),
            salary: 0,
            currency: 'ZMW',
            contractType: 'full_time'
          },
          isActive: true
        });

        await defaultAdmin.save();
        logger.info('Default admin user created', { email: defaultAdmin.email });

        // Initialize default settings
        const AdminSettings = mongoose.model('AdminSettings');
        await AdminSettings.initializeDefaults(defaultAdmin._id);
        logger.info('Default admin settings initialized');
      }

      logger.info('Default data initialization completed');
    } catch (error) {
      logger.error('Error initializing default data', { error: error.message });
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    try {
      logger.info('Starting database backup...', { backupPath });
      
      // This is a placeholder for backup functionality
      // In production, you might use mongodump or similar tools
      
      logger.info('Database backup completed');
    } catch (error) {
      logger.error('Error backing up database', { error: error.message });
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath) {
    try {
      logger.info('Starting database restore...', { backupPath });
      
      // This is a placeholder for restore functionality
      // In production, you might use mongorestore or similar tools
      
      logger.info('Database restore completed');
    } catch (error) {
      logger.error('Error restoring database', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  async cleanup() {
    try {
      logger.info('Starting database cleanup...');

      // Clean up expired audit logs
      const AuditLog = mongoose.model('AuditLog');
      const expiredLogs = await AuditLog.cleanupExpired();
      logger.info(`Cleaned up ${expiredLogs.deletedCount} expired audit logs`);

      // Archive old audit logs
      const logsToArchive = await AuditLog.findForArchival();
      if (logsToArchive.length > 0) {
        await AuditLog.updateMany(
          { _id: { $in: logsToArchive.map(log => log._id) } },
          { isArchived: true, archivedAt: new Date() }
        );
        logger.info(`Archived ${logsToArchive.length} old audit logs`);
      }

      logger.info('Database cleanup completed');
    } catch (error) {
      logger.error('Error during database cleanup', { error: error.message });
      throw error;
    }
  }

  /**
   * Utility method to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      if (!this.isHealthy()) {
        throw new Error('Database not connected');
      }

      // Perform a simple operation to test the connection
      await mongoose.connection.db.admin().ping();
      
      return {
        success: true,
        message: 'Database connection is healthy',
        status: this.getStatus(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: `Database connection test failed: ${error.message}`,
        status: this.getStatus(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo() {
    try {
      if (!this.isHealthy()) {
        throw new Error('Database not connected');
      }

      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      const collectionInfo = await Promise.all(
        collections.map(async (collection) => {
          const stats = await db.collection(collection.name).stats();
          return {
            name: collection.name,
            type: collection.type,
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            indexes: stats.nindexes,
            indexSize: stats.totalIndexSize
          };
        })
      );

      return collectionInfo;
    } catch (error) {
      logger.error('Error getting collection info', { error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;