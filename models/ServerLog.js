const mongoose = require('mongoose');

const serverLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    unique: true,
    required: true
  },
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug', 'trace'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  source: {
    type: String,
    enum: ['api', 'database', 'auth', 'payment', 'email', 'file_upload', 'websocket', 'cron', 'system'],
    required: true
  },
  service: {
    type: String,
    default: 'gule-backend'
  },
  module: String,
  function: String,
  endpoint: String,
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
  },
  statusCode: Number,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  sessionId: String,
  requestId: String,
  correlationId: String,
  ipAddress: String,
  userAgent: String,
  duration: Number, // in milliseconds
  error: {
    name: String,
    message: String,
    stack: String,
    code: String
  },
  request: {
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed
  },
  response: {
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    size: Number
  },
  database: {
    query: String,
    collection: String,
    operation: String,
    executionTime: Number,
    documentsAffected: Number
  },
  performance: {
    memoryUsage: {
      rss: Number,
      heapTotal: Number,
      heapUsed: Number,
      external: Number
    },
    cpuUsage: {
      user: Number,
      system: Number
    },
    responseTime: Number
  },
  metadata: {
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: process.env.NODE_ENV || 'development'
    },
    version: String,
    hostname: String,
    pid: Number,
    platform: String,
    nodeVersion: String
  },
  tags: [String],
  context: mongoose.Schema.Types.Mixed,
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
serverLogSchema.index({ logId: 1 });
serverLogSchema.index({ level: 1 });
serverLogSchema.index({ source: 1 });
serverLogSchema.index({ createdAt: -1 });
serverLogSchema.index({ userId: 1 });
serverLogSchema.index({ sellerId: 1 });
serverLogSchema.index({ adminId: 1 });
serverLogSchema.index({ sessionId: 1 });
serverLogSchema.index({ requestId: 1 });
serverLogSchema.index({ statusCode: 1 });
serverLogSchema.index({ endpoint: 1 });
serverLogSchema.index({ archived: 1 });

// TTL index for automatic cleanup of old logs (30 days)
serverLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Virtual for log age
serverLogSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for severity score
serverLogSchema.virtual('severityScore').get(function() {
  const scores = {
    'error': 5,
    'warn': 4,
    'info': 3,
    'debug': 2,
    'trace': 1
  };
  return scores[this.level] || 0;
});

// Pre-save middleware
serverLogSchema.pre('save', async function(next) {
  if (!this.logId) {
    const count = await this.constructor.countDocuments();
    this.logId = `LOG-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
  }
  
  // Set metadata if not provided
  if (!this.metadata.hostname) {
    this.metadata.hostname = require('os').hostname();
  }
  if (!this.metadata.pid) {
    this.metadata.pid = process.pid;
  }
  if (!this.metadata.platform) {
    this.metadata.platform = process.platform;
  }
  if (!this.metadata.nodeVersion) {
    this.metadata.nodeVersion = process.version;
  }
  
  next();
});

// Static method to create log entry
serverLogSchema.statics.createLog = function(level, message, options = {}) {
  return this.create({
    level,
    message,
    ...options,
    metadata: {
      ...options.metadata,
      environment: process.env.NODE_ENV || 'development'
    }
  });
};

// Static method to get logs by criteria
serverLogSchema.statics.getLogs = function(criteria = {}, options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = -1,
    ...filters
  } = options;
  
  const skip = (page - 1) * limit;
  
  return this.find({ ...criteria, ...filters })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'username email')
    .populate('sellerId', 'businessName email')
    .populate('adminId', 'username email');
};

// Static method to get log statistics
serverLogSchema.statics.getLogStats = function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        sources: { $addToSet: '$source' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to archive old logs
serverLogSchema.statics.archiveOldLogs = function(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      archived: false
    },
    {
      $set: {
        archived: true,
        archivedAt: new Date()
      }
    }
  );
};

module.exports = mongoose.model('ServerLog', serverLogSchema);