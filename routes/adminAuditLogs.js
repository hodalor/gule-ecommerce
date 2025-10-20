const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../config/logger');

// Get all audit logs with filtering and pagination
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      action = '',
      user = '',
      startDate = '',
      endDate = '',
      severity = '',
      module = '',
      status = '',
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'performedBy.firstName': { $regex: search, $options: 'i' } },
        { 'performedBy.lastName': { $regex: search, $options: 'i' } },
        { 'performedBy.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Action type filter
    if (action) {
      filter.actionType = action;
    }

    // User filter
    if (user) {
      filter.performedBy = user;
    }

    // Date range filter
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.timestamp = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.timestamp = { $lte: new Date(endDate) };
    }

    // Severity filter
    if (severity) {
      filter.severity = severity;
    }

    // Module filter
    if (module) {
      filter.module = module;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [logs, totalCount] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'firstName lastName email employeeId')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    // Format logs for frontend
    const formattedLogs = logs.map(log => ({
      id: log._id,
      logId: log.logId,
      timestamp: log.timestamp,
      action: log.action || log.actionType,
      actionType: log.actionType,
      module: log.module,
      user: log.performedBy ? {
        id: log.performedBy._id,
        name: `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}`.trim(),
        email: log.performedBy.email,
        employeeId: log.performedBy.employeeId
      } : {
        id: log.performedBy,
        name: 'Unknown User',
        email: 'N/A'
      },
      userType: log.userType,
      description: log.description || `${log.actionType} action performed on ${log.module}`,
      severity: log.severity,
      status: log.status,
      ipAddress: log.session?.ipAddress || log.ipAddress,
      userAgent: log.session?.userAgent || log.userAgent,
      targetResource: log.targetResource,
      targetId: log.targetId,
      metadata: log.metadata,
      category: log.category,
      riskLevel: log.riskLevel
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching audit logs:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      query: req.query
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// Get audit log statistics
router.get('/statistics', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [stats] = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          successfulActions: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failedActions: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
          criticalEvents: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highSeverityEvents: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          securityEvents: { $sum: { $cond: [{ $eq: ['$category', 'security'] }, 1, 0] } },
          loginAttempts: { $sum: { $cond: [{ $eq: ['$actionType', 'login'] }, 1, 0] } },
          failedLogins: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ['$actionType', 'login'] }, { $eq: ['$status', 'failure'] }] }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]);

    // Get module breakdown
    const moduleStats = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get action type breakdown
    const actionStats = await AuditLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent critical events
    const recentCriticalEvents = await AuditLog.find({
      ...dateFilter,
      severity: { $in: ['critical', 'high'] }
    })
    .populate('performedBy', 'firstName lastName email')
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      data: {
        overview: stats || {
          totalLogs: 0,
          successfulActions: 0,
          failedActions: 0,
          criticalEvents: 0,
          highSeverityEvents: 0,
          securityEvents: 0,
          loginAttempts: 0,
          failedLogins: 0
        },
        moduleBreakdown: moduleStats,
        actionBreakdown: actionStats,
        recentCriticalEvents: recentCriticalEvents.map(event => ({
          id: event._id,
          timestamp: event.timestamp,
          action: event.action || event.actionType,
          severity: event.severity,
          user: event.performedBy ? `${event.performedBy.firstName} ${event.performedBy.lastName}` : 'Unknown',
          description: event.description
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching audit log statistics:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log statistics'
    });
  }
});

// Get specific audit log details
router.get('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findById(id)
      .populate('performedBy', 'firstName lastName email employeeId')
      .populate('correlation.relatedLogs')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    // Format log for frontend
    const formattedLog = {
      id: log._id,
      logId: log.logId,
      timestamp: log.timestamp,
      action: log.action || log.actionType,
      actionType: log.actionType,
      module: log.module,
      user: log.performedBy ? {
        id: log.performedBy._id,
        name: `${log.performedBy.firstName || ''} ${log.performedBy.lastName || ''}`.trim(),
        email: log.performedBy.email,
        employeeId: log.performedBy.employeeId
      } : null,
      userType: log.userType,
      description: log.description,
      severity: log.severity,
      status: log.status,
      session: log.session,
      request: log.request,
      response: log.response,
      targetResource: log.targetResource,
      targetId: log.targetId,
      targetModel: log.targetModel,
      changes: log.changes,
      metadata: log.metadata,
      category: log.category,
      riskLevel: log.riskLevel,
      compliance: log.compliance,
      correlation: log.correlation,
      alerts: log.alerts,
      tags: log.tags,
      errorCode: log.errorCode,
      errorMessage: log.errorMessage
    };

    res.json({
      success: true,
      data: formattedLog
    });

  } catch (error) {
    logger.error('Error fetching audit log details:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      logId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log details'
    });
  }
});

// Export audit logs
router.post('/export', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      format = 'json',
      filters = {},
      startDate,
      endDate
    } = req.body;

    // Build filter query
    const filter = { ...filters };
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'firstName lastName email employeeId')
      .sort({ timestamp: -1 })
      .lean();

    // Log the export action
    await AuditLog.create({
      performedBy: req.user.id,
      userType: 'Admin',
      actionType: 'export',
      module: 'audit',
      action: 'AUDIT_LOGS_EXPORT',
      description: `Exported ${logs.length} audit logs`,
      severity: 'medium',
      status: 'success',
      session: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      metadata: {
        exportFormat: format,
        recordCount: logs.length,
        filters: filters
      }
    });

    res.json({
      success: true,
      data: {
        logs: logs,
        count: logs.length,
        exportedAt: new Date(),
        format: format
      }
    });

  } catch (error) {
    logger.error('Error exporting audit logs:', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs'
    });
  }
});

module.exports = router;