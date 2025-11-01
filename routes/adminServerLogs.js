const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');
const { AuditLog } = require('../models');

// Get server logs with real-time capabilities
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      level = 'all',
      limit = 100,
      offset = 0,
      startDate = '',
      endDate = '',
      search = ''
    } = req.query;

    const logsDir = path.join(__dirname, '../logs');
    const logFiles = {
      combined: path.join(logsDir, 'combined.log'),
      error: path.join(logsDir, 'error.log')
    };

    let logs = [];

    // Read log files based on level filter
    if (level === 'all' || level === 'combined') {
      try {
        const combinedData = await fs.readFile(logFiles.combined, 'utf8');
        const combinedLogs = combinedData.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              const parsed = JSON.parse(line);
              return {
                ...parsed,
                source: 'combined',
                id: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
            } catch (e) {
              return {
                level: 'info',
                message: line,
                timestamp: new Date().toISOString(),
                source: 'combined',
                id: `combined_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
            }
          });
        logs = logs.concat(combinedLogs);
      } catch (error) {
        // File might not exist yet
      }
    }

    if (level === 'all' || level === 'error') {
      try {
        const errorData = await fs.readFile(logFiles.error, 'utf8');
        const errorLogs = errorData.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              const parsed = JSON.parse(line);
              return {
                ...parsed,
                source: 'error',
                id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
            } catch (e) {
              return {
                level: 'error',
                message: line,
                timestamp: new Date().toISOString(),
                source: 'error',
                id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              };
            }
          });
        logs = logs.concat(errorLogs);
      } catch (error) {
        // File might not exist yet
      }
    }

    // Apply filters
    let filteredLogs = logs;

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    // Search filter
    if (search) {
      filteredLogs = filteredLogs.filter(log => 
        log.message?.toLowerCase().includes(search.toLowerCase()) ||
        log.level?.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(log).toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    // Format logs for frontend
    const formattedLogs = paginatedLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level || 'info',
      message: log.message || '',
      source: log.source,
      service: log.service || 'gule-backend',
      stack: log.stack,
      metadata: {
        ...log,
        id: undefined,
        timestamp: undefined,
        level: undefined,
        message: undefined,
        source: undefined,
        service: undefined,
        stack: undefined
      }
    }));

    // Log the server logs access
    await AuditLog.logAction({
      action: 'SERVER_LOGS_ACCESS',
      actionType: 'read',
      module: 'system',
      userId: req.user.id,
      userType: 'admin',
      description: `Accessed server logs (${paginatedLogs.length} entries)`,
      severity: 'low',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        level,
        offset: parseInt(offset),
        limit: parseInt(limit)
      }
    });

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          offset: parseInt(offset),
          limit: parseInt(limit),
          total: filteredLogs.length,
          hasMore: parseInt(offset) + parseInt(limit) < filteredLogs.length
        },
        filters: {
          level,
          startDate,
          endDate,
          search
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching server logs:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch server logs'
    });
  }
});

// Get server log statistics
router.get('/statistics', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '../logs');
    const logFiles = {
      combined: path.join(logsDir, 'combined.log'),
      error: path.join(logsDir, 'error.log')
    };

    const stats = {
      totalLogs: 0,
      errorLogs: 0,
      warningLogs: 0,
      infoLogs: 0,
      debugLogs: 0,
      fileStats: {}
    };

    // Get file statistics
    for (const [type, filePath] of Object.entries(logFiles)) {
      try {
        const fileStats = await fs.stat(filePath);
        const data = await fs.readFile(filePath, 'utf8');
        const lines = data.split('\n').filter(line => line.trim());
        
        stats.fileStats[type] = {
          size: fileStats.size,
          lastModified: fileStats.mtime,
          lineCount: lines.length
        };

        // Count log levels
        lines.forEach(line => {
          try {
            const parsed = JSON.parse(line);
            stats.totalLogs++;
            
            switch (parsed.level) {
              case 'error':
                stats.errorLogs++;
                break;
              case 'warn':
                stats.warningLogs++;
                break;
              case 'info':
                stats.infoLogs++;
                break;
              case 'debug':
                stats.debugLogs++;
                break;
            }
          } catch (e) {
            stats.totalLogs++;
            stats.infoLogs++; // Default to info for unparseable lines
          }
        });
      } catch (error) {
        stats.fileStats[type] = {
          size: 0,
          lastModified: null,
          lineCount: 0,
          error: 'File not accessible'
        };
      }
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching server log statistics:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch server log statistics'
    });
  }
});

// Clear server logs (with backup)
router.delete('/clear', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { logType = 'all', createBackup = true } = req.body;
    
    const logsDir = path.join(__dirname, '../logs');
    const backupDir = path.join(logsDir, 'backups');
    
    // Ensure backup directory exists
    if (createBackup) {
      try {
        await fs.mkdir(backupDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }

    const logFiles = {
      combined: path.join(logsDir, 'combined.log'),
      error: path.join(logsDir, 'error.log')
    };

    const filesToClear = logType === 'all' ? Object.values(logFiles) : [logFiles[logType]];
    const clearedFiles = [];

    for (const filePath of filesToClear) {
      try {
        // Create backup if requested
        if (createBackup) {
          const fileName = path.basename(filePath);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);
          
          try {
            await fs.copyFile(filePath, backupPath);
          } catch (error) {
            // Original file might not exist
          }
        }

        // Clear the log file
        await fs.writeFile(filePath, '');
        clearedFiles.push(path.basename(filePath));
      } catch (error) {
        logger.error(`Error clearing log file ${filePath}:`, error);
      }
    }

    // Log the clear action
    await AuditLog.logAction({
      action: 'SERVER_LOGS_CLEARED',
      actionType: 'delete',
      module: 'system',
      userId: req.user.id,
      userType: 'admin',
      description: `Cleared server logs: ${clearedFiles.join(', ')}`,
      severity: 'medium',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        logType,
        createBackup,
        clearedFiles
      }
    });

    res.json({
      success: true,
      message: `Successfully cleared ${clearedFiles.length} log file(s)`,
      data: {
        clearedFiles: clearedFiles,
        backupCreated: createBackup
      }
    });

  } catch (error) {
    logger.error('Error clearing server logs:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to clear server logs'
    });
  }
});

// Download server logs
router.get('/download/:type', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { type } = req.params;
    const logsDir = path.join(__dirname, '../logs');
    
    const logFiles = {
      combined: path.join(logsDir, 'combined.log'),
      error: path.join(logsDir, 'error.log')
    };

    if (!logFiles[type]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid log type'
      });
    }

    const filePath = logFiles[type];
    
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Log file not found'
      });
    }

    // Log the download action
    await AuditLog.logAction({
      action: 'SERVER_LOGS_DOWNLOAD',
      actionType: 'export',
      module: 'system',
      userId: req.user.id,
      userType: 'admin',
      description: `Downloaded ${type} server logs`,
      severity: 'low',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        logType: type,
        filePath: path.basename(filePath)
      }
    });

    const fileName = `${type}-logs-${new Date().toISOString().split('T')[0]}.log`;
    res.download(filePath, fileName);

  } catch (error) {
    logger.error('Error downloading server logs:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      logType: req.params.type
    });

    res.status(500).json({
      success: false,
      error: 'Failed to download server logs'
    });
  }
});

module.exports = router;