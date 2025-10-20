const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting
const sessionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many session requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Get user's active sessions
router.get('/active',
  sessionRateLimit,
  authenticate,
  async (req, res) => {
    try {
      const sessions = await Session.find({
        userId: req.user.id,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active sessions',
        error: error.message
      });
    }
  }
);

// Get user's session history
router.get('/history',
  sessionRateLimit,
  authenticate,
  [validatePagination],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, sort = '-lastActivity' } = req.query;
      const skip = (page - 1) * limit;

      const sessions = await Session.find({
        userId: req.user.id
      })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Session.countDocuments({ userId: req.user.id });

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session history',
        error: error.message
      });
    }
  }
);

// Get current session details
router.get('/current',
  authenticate,
  async (req, res) => {
    try {
      const session = await Session.findOne({
        sessionId: req.sessionId,
        userId: req.user.id,
        isActive: true
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Current session not found'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current session',
        error: error.message
      });
    }
  }
);

// Terminate a specific session
router.delete('/:sessionId',
  authenticate,
  [param('sessionId').isString().trim()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const session = await Session.findOne({
        sessionId: req.params.sessionId,
        userId: req.user.id
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      session.isActive = false;
      session.endedAt = new Date();
      session.endReason = 'user_terminated';
      await session.save();

      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to terminate session',
        error: error.message
      });
    }
  }
);

// Terminate all other sessions (keep current)
router.post('/terminate-others',
  authenticate,
  async (req, res) => {
    try {
      const result = await Session.updateMany(
        {
          userId: req.user.id,
          sessionId: { $ne: req.sessionId },
          isActive: true
        },
        {
          $set: {
            isActive: false,
            endedAt: new Date(),
            endReason: 'user_terminated_others'
          }
        }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} sessions terminated successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to terminate other sessions',
        error: error.message
      });
    }
  }
);

// Update session activity (usually called automatically)
router.patch('/activity',
  authenticate,
  [
    body('page').optional().isString().trim(),
    body('action').optional().isString().trim(),
    body('metadata').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const session = await Session.findOne({
        sessionId: req.sessionId,
        userId: req.user.id,
        isActive: true
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Active session not found'
        });
      }

      // Update last activity
      session.lastActivity = new Date();
      
      // Add activity log if provided
      if (req.body.page || req.body.action) {
        session.addActivity({
          page: req.body.page,
          action: req.body.action,
          metadata: req.body.metadata
        });
      }

      await session.save();

      res.json({
        success: true,
        message: 'Session activity updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update session activity',
        error: error.message
      });
    }
  }
);

// Admin routes for session management
router.get('/admin/all',
  authenticate,
  authorizeUserType(['admin']),
  [
    query('userId').optional().isMongoId(),
    query('isActive').optional().isBoolean(),
    query('userType').optional().isIn(['buyer', 'seller', 'admin']),
    query('deviceType').optional().isIn(['desktop', 'mobile', 'tablet']),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, userId, isActive, userType, deviceType, sort = '-lastActivity' } = req.query;
      const skip = (page - 1) * limit;

      let filter = {};
      if (userId) filter.userId = userId;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (deviceType) filter['deviceInfo.type'] = deviceType;

      let pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' }
      ];

      if (userType) {
        pipeline.push({
          $match: { 'user.userType': userType }
        });
      }

      pipeline.push(
        { $sort: { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            sessionId: 1,
            userId: 1,
            'user.username': 1,
            'user.email': 1,
            'user.userType': 1,
            ipAddress: 1,
            userAgent: 1,
            deviceInfo: 1,
            location: 1,
            isActive: 1,
            createdAt: 1,
            lastActivity: 1,
            endedAt: 1,
            endReason: 1
          }
        }
      );

      const sessions = await Session.aggregate(pipeline);

      // Get total count
      const totalPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' }
      ];

      if (userType) {
        totalPipeline.push({
          $match: { 'user.userType': userType }
        });
      }

      totalPipeline.push({ $count: 'total' });

      const totalResult = await Session.aggregate(totalPipeline);
      const total = totalResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          sessions,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sessions',
        error: error.message
      });
    }
  }
);

// Admin: Get session statistics
router.get('/admin/statistics',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await Session.aggregate([
        {
          $facet: {
            activeSessions: [
              { $match: { isActive: true, expiresAt: { $gt: now } } },
              { $count: 'count' }
            ],
            dailyActive: [
              { $match: { lastActivity: { $gte: oneDayAgo } } },
              { $count: 'count' }
            ],
            weeklyActive: [
              { $match: { lastActivity: { $gte: oneWeekAgo } } },
              { $count: 'count' }
            ],
            monthlyActive: [
              { $match: { lastActivity: { $gte: oneMonthAgo } } },
              { $count: 'count' }
            ],
            deviceBreakdown: [
              {
                $group: {
                  _id: '$deviceInfo.type',
                  count: { $sum: 1 }
                }
              }
            ],
            userTypeBreakdown: [
              {
                $lookup: {
                  from: 'users',
                  localField: 'userId',
                  foreignField: '_id',
                  as: 'user'
                }
              },
              { $unwind: '$user' },
              {
                $group: {
                  _id: '$user.userType',
                  activeSessions: {
                    $sum: {
                      $cond: [
                        { $and: [{ $eq: ['$isActive', true] }, { $gt: ['$expiresAt', now] }] },
                        1,
                        0
                      ]
                    }
                  },
                  totalSessions: { $sum: 1 }
                }
              }
            ],
            averageSessionDuration: [
              {
                $match: {
                  endedAt: { $exists: true },
                  createdAt: { $exists: true }
                }
              },
              {
                $project: {
                  duration: {
                    $divide: [
                      { $subtract: ['$endedAt', '$createdAt'] },
                      1000 * 60 // Convert to minutes
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  avgDuration: { $avg: '$duration' }
                }
              }
            ]
          }
        }
      ]);

      const result = stats[0];

      res.json({
        success: true,
        data: {
          activeSessions: result.activeSessions[0]?.count || 0,
          dailyActiveUsers: result.dailyActive[0]?.count || 0,
          weeklyActiveUsers: result.weeklyActive[0]?.count || 0,
          monthlyActiveUsers: result.monthlyActive[0]?.count || 0,
          deviceBreakdown: result.deviceBreakdown,
          userTypeBreakdown: result.userTypeBreakdown,
          averageSessionDuration: result.averageSessionDuration[0]?.avgDuration || 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session statistics',
        error: error.message
      });
    }
  }
);

// Admin: Force terminate session
router.delete('/admin/:sessionId',
  authenticate,
  authorizeUserType(['admin']),
  [param('sessionId').isString().trim()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const session = await Session.findOne({
        sessionId: req.params.sessionId
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      session.isActive = false;
      session.endedAt = new Date();
      session.endReason = 'admin_terminated';
      await session.save();

      res.json({
        success: true,
        message: 'Session terminated by admin'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to terminate session',
        error: error.message
      });
    }
  }
);

// Admin: Terminate all sessions for a user
router.post('/admin/terminate-user/:userId',
  authenticate,
  authorizeUserType(['admin']),
  [param('userId').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await Session.updateMany(
        {
          userId: req.params.userId,
          isActive: true
        },
        {
          $set: {
            isActive: false,
            endedAt: new Date(),
            endReason: 'admin_terminated_all'
          }
        }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} sessions terminated for user`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to terminate user sessions',
        error: error.message
      });
    }
  }
);

module.exports = router;