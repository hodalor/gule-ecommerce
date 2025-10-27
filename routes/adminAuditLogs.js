const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

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

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

module.exports = router;