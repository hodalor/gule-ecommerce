const winston = require('winston');
const path = require('path');
require('winston-mongodb');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports array
const transports = [
  // Write all logs with level 'error' and below to error.log
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 10, // Keep 10 rotated files
    format: logFormat,
  }),
  // Write all logs with level 'info' and below to combined.log
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 10, // Keep 10 rotated files
    format: logFormat,
  }),
];

// MongoDB transport will be attached lazily after DB connection via attachMongoTransport(dbOrUri)

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: logFormat,
  defaultMeta: { service: 'gule-marketplace' },
  transports,
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Attach MongoDB transport lazily after DB connection
function attachMongoTransport(dbOrUri) {
  try {
    // Skip if already attached
    const alreadyAttached = logger.transports.some(t => t.name === 'mongodb');
    if (alreadyAttached) return true;

    const baseOptions = {
      collection: 'logs',
      level: 'error',
      format: logFormat,
      options: { useUnifiedTopology: true }
    };

    const transportOptions = typeof dbOrUri === 'string'
      ? { db: dbOrUri, ...baseOptions }
      : { db: dbOrUri, ...baseOptions };

    const mongoTransport = new winston.transports.MongoDB(transportOptions);

    // Prevent transport errors from crashing the app
    mongoTransport.on('error', (err) => {
      logger.warn('MongoDB log transport error', { error: err.message });
    });

    logger.add(mongoTransport);
    logger.info('MongoDB log transport attached');
    return true;
  } catch (err) {
    logger.warn('Failed to attach MongoDB log transport', { error: err.message });
    return false;
  }
}

// Override logger methods to emit real-time updates
const originalLog = logger.log;
logger.log = function(level, message, meta = {}) {
  const result = originalLog.call(this, level, message, meta);
  
  // Emit real-time log update if global function is available
  if (typeof global.emitLogUpdate === 'function') {
    const logData = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      meta: meta,
      service: 'gule-backend'
    };
    global.emitLogUpdate(logData);
  }
  
  return result;
};

module.exports = logger;
module.exports.attachMongoTransport = attachMongoTransport;