const express = require('express');
const router = express.Router();
const EscrowTransaction = require('../models/Escrow');
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting for admin dispute operations
const disputeRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each admin to 50 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many dispute requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Get all disputes with filtering and pagination
router.get('/',
  disputeRateLimit,
  authenticate,
  authorizeUserType(['admin']),
  [
    query('status').optional().isIn(['pending_review', 'under_investigation', 'resolved', 'rejected', 'escalated']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('type').optional().isIn(['refund', 'quality', 'delivery', 'fraud', 'other']),
    query('search').optional().isString().trim(),
    query('dateFilter').optional().isIn(['today', 'week', 'month', 'quarter', 'year', 'all']),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        priority, 
        type, 
        search, 
        dateFilter,
        sort = '-createdAt' 
      } = req.query;

      // Build filter query
      let filter = { status: 'disputed' }; // Only get disputed escrow transactions
      
      if (status && status !== 'all') {
        // Map admin dispute statuses to escrow statuses
        const statusMap = {
          'pending_review': 'disputed',
          'under_investigation': 'disputed',
          'resolved': ['released', 'refunded'],
          'rejected': 'disputed',
          'escalated': 'disputed'
        };
        
        if (Array.isArray(statusMap[status])) {
          filter.status = { $in: statusMap[status] };
        } else {
          filter.status = statusMap[status];
        }
      }

      // Date filtering
      if (dateFilter && dateFilter !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        if (startDate) {
          filter.disputedAt = { $gte: startDate };
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build aggregation pipeline for complex queries
      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'orders',
            localField: 'order',
            foreignField: '_id',
            as: 'order'
          }
        },
        { $unwind: '$order' },
        {
          $lookup: {
            from: 'users',
            localField: 'buyer',
            foreignField: '_id',
            as: 'buyer'
          }
        },
        { $unwind: '$buyer' },
        {
          $lookup: {
            from: 'sellers',
            localField: 'seller',
            foreignField: '_id',
            as: 'seller'
          }
        },
        { $unwind: '$seller' },
        {
          $lookup: {
            from: 'admins',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignedAdmin'
          }
        }
      ];

      // Add search filter
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { 'order.orderNumber': { $regex: search, $options: 'i' } },
              { 'buyer.firstName': { $regex: search, $options: 'i' } },
              { 'buyer.lastName': { $regex: search, $options: 'i' } },
              { 'seller.businessName': { $regex: search, $options: 'i' } },
              { 'disputeReason': { $regex: search, $options: 'i' } },
              { 'disputeDescription': { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      // Add projection to format response
      pipeline.push({
        $project: {
          id: '$_id',
          orderId: '$order._id',
          orderNumber: '$order.orderNumber',
          type: '$disputeType',
          status: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'disputed'] }, then: 'pending_review' },
                { case: { $eq: ['$status', 'released'] }, then: 'resolved' },
                { case: { $eq: ['$status', 'refunded'] }, then: 'resolved' }
              ],
              default: '$status'
            }
          },
          priority: { $ifNull: ['$priority', 'medium'] },
          title: '$disputeReason',
          description: '$disputeDescription',
          amount: '$amount',
          buyer: {
            id: '$buyer._id',
            name: { $concat: ['$buyer.firstName', ' ', '$buyer.lastName'] },
            email: '$buyer.email'
          },
          seller: {
            id: '$seller._id',
            name: '$seller.businessName',
            email: '$seller.email'
          },
          assignedTo: { $arrayElemAt: ['$assignedAdmin', 0] },
          createdAt: '$disputedAt',
          updatedAt: '$updatedAt',
          lastMessage: '$lastMessage'
        }
      });

      // Add sorting
      const sortObj = {};
      if (sort.startsWith('-')) {
        sortObj[sort.substring(1)] = -1;
      } else {
        sortObj[sort] = 1;
      }
      pipeline.push({ $sort: sortObj });

      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit) });

      const disputes = await EscrowTransaction.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
      countPipeline.push({ $count: 'total' });
      const countResult = await EscrowTransaction.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      res.json({
        success: true,
        data: {
          disputes,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNext: skip + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching admin disputes', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch disputes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get dispute by ID
router.get('/:id',
  disputeRateLimit,
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId().withMessage('Invalid dispute ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const dispute = await EscrowTransaction.findById(req.params.id)
        .populate('order', 'orderNumber status total products')
        .populate('buyer', 'firstName lastName email phone')
        .populate('seller', 'businessName email phone')
        .populate('assignedTo', 'firstName lastName email')
        .populate('disputeResolvedBy', 'firstName lastName email')
        .lean();

      if (!dispute) {
        return res.status(404).json({
          success: false,
          message: 'Dispute not found'
        });
      }

      if (dispute.status !== 'disputed' && !['released', 'refunded'].includes(dispute.status)) {
        return res.status(404).json({
          success: false,
          message: 'Dispute not found'
        });
      }

      // Format response
      const formattedDispute = {
        id: dispute._id,
        orderId: dispute.order._id,
        orderNumber: dispute.order.orderNumber,
        type: dispute.disputeType || 'refund',
        status: dispute.status === 'disputed' ? 'pending_review' : 'resolved',
        priority: dispute.priority || 'medium',
        title: dispute.disputeReason,
        description: dispute.disputeDescription,
        amount: dispute.amount,
        buyer: {
          id: dispute.buyer._id,
          name: `${dispute.buyer.firstName} ${dispute.buyer.lastName}`,
          email: dispute.buyer.email,
          phone: dispute.buyer.phone
        },
        seller: {
          id: dispute.seller._id,
          name: dispute.seller.businessName,
          email: dispute.seller.email,
          phone: dispute.seller.phone
        },
        assignedTo: dispute.assignedTo,
        resolution: dispute.disputeResolution,
        adminNotes: dispute.adminNotes,
        createdAt: dispute.disputedAt,
        updatedAt: dispute.updatedAt,
        resolvedAt: dispute.disputeResolvedAt,
        resolvedBy: dispute.disputeResolvedBy,
        activityLog: dispute.activityLog || []
      };

      res.json({
        success: true,
        data: formattedDispute
      });

    } catch (error) {
      logger.error('Error fetching dispute details', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dispute details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update dispute status
router.patch('/:id/status',
  disputeRateLimit,
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('status').isIn(['pending_review', 'under_investigation', 'resolved', 'rejected', 'escalated']),
    body('reason').optional().isString().trim().isLength({ min: 1, max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      
      const dispute = await EscrowTransaction.findById(req.params.id);
      
      if (!dispute) {
        return res.status(404).json({
          success: false,
          message: 'Dispute not found'
        });
      }

      if (dispute.status !== 'disputed') {
        return res.status(400).json({
          success: false,
          message: 'Dispute is not in a state that can be updated'
        });
      }

      // Update dispute status (stored in custom field for admin tracking)
      dispute.adminDisputeStatus = status;
      dispute.statusUpdatedAt = new Date();
      dispute.statusUpdatedBy = req.user.id;
      
      if (reason) {
        dispute.statusUpdateReason = reason;
      }

      // Add to activity log
      if (!dispute.activityLog) {
        dispute.activityLog = [];
      }
      
      dispute.activityLog.push({
        action: 'STATUS_UPDATED',
        performedBy: req.user.id,
        performedByType: 'admin',
        details: { oldStatus: dispute.adminDisputeStatus, newStatus: status, reason },
        timestamp: new Date()
      });

      await dispute.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'admin',
        action: 'UPDATE_DISPUTE_STATUS',
        resource: 'EscrowTransaction',
        resourceId: dispute._id,
        details: { newStatus: status, reason },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Dispute status updated successfully',
        data: { id: dispute._id, status, updatedAt: dispute.statusUpdatedAt }
      });

    } catch (error) {
      logger.error('Error updating dispute status', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update dispute status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Assign dispute to admin
router.patch('/:id/assign',
  disputeRateLimit,
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('adminId').isMongoId().withMessage('Invalid admin ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { adminId } = req.body;
      
      // Verify admin exists and has dispute permissions
      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
      }

      const dispute = await EscrowTransaction.findById(req.params.id);
      
      if (!dispute) {
        return res.status(404).json({
          success: false,
          message: 'Dispute not found'
        });
      }

      if (dispute.status !== 'disputed') {
        return res.status(400).json({
          success: false,
          message: 'Dispute is not in a state that can be assigned'
        });
      }

      dispute.assignedTo = adminId;
      dispute.assignedAt = new Date();
      dispute.assignedBy = req.user.id;

      // Add to activity log
      if (!dispute.activityLog) {
        dispute.activityLog = [];
      }
      
      dispute.activityLog.push({
        action: 'ASSIGNED',
        performedBy: req.user.id,
        performedByType: 'admin',
        details: { assignedTo: adminId, assignedToName: `${admin.firstName} ${admin.lastName}` },
        timestamp: new Date()
      });

      await dispute.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'admin',
        action: 'ASSIGN_DISPUTE',
        resource: 'EscrowTransaction',
        resourceId: dispute._id,
        details: { assignedTo: adminId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Dispute assigned successfully',
        data: { 
          id: dispute._id, 
          assignedTo: adminId, 
          assignedAt: dispute.assignedAt 
        }
      });

    } catch (error) {
      logger.error('Error assigning dispute', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign dispute',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Resolve dispute
router.post('/:id/resolve',
  disputeRateLimit,
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('resolution').isString().trim().isLength({ min: 10, max: 1000 }).withMessage('Resolution must be between 10 and 1000 characters'),
    body('refundToBuyer').isBoolean(),
    body('releaseToSeller').isBoolean(),
    body('adminNotes').optional().isString().trim().isLength({ max: 500 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { resolution, refundToBuyer, releaseToSeller, adminNotes } = req.body;
      
      if (refundToBuyer && releaseToSeller) {
        return res.status(400).json({
          success: false,
          message: 'Cannot both refund to buyer and release to seller'
        });
      }

      if (!refundToBuyer && !releaseToSeller) {
        return res.status(400).json({
          success: false,
          message: 'Must specify either refund to buyer or release to seller'
        });
      }

      const dispute = await EscrowTransaction.findById(req.params.id)
        .populate('order', 'orderNumber')
        .populate('buyer', 'firstName lastName')
        .populate('seller', 'businessName');
      
      if (!dispute) {
        return res.status(404).json({
          success: false,
          message: 'Dispute not found'
        });
      }

      if (dispute.status !== 'disputed') {
        return res.status(400).json({
          success: false,
          message: 'Dispute is not in disputed status'
        });
      }

      // Update transaction based on resolution
      if (refundToBuyer) {
        dispute.status = 'refunded';
        dispute.refundedAt = new Date();
      } else if (releaseToSeller) {
        dispute.status = 'released';
        dispute.releasedAt = new Date();
        dispute.releasedBy = req.user.id;
      }

      dispute.disputeResolvedAt = new Date();
      dispute.disputeResolvedBy = req.user.id;
      dispute.disputeResolution = resolution;
      dispute.adminNotes = adminNotes;

      // Add to activity log
      if (!dispute.activityLog) {
        dispute.activityLog = [];
      }
      
      dispute.activityLog.push({
        action: 'RESOLVED',
        performedBy: req.user.id,
        performedByType: 'admin',
        details: { 
          resolution, 
          refundToBuyer, 
          releaseToSeller, 
          adminNotes,
          newStatus: dispute.status 
        },
        timestamp: new Date()
      });

      await dispute.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'admin',
        action: 'RESOLVE_DISPUTE',
        resource: 'EscrowTransaction',
        resourceId: dispute._id,
        details: { 
          resolution, 
          refundToBuyer, 
          releaseToSeller, 
          adminNotes 
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Dispute resolved', {
        disputeId: dispute._id,
        resolvedBy: req.user.id,
        resolution: refundToBuyer ? 'refund' : 'release'
      });

      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        data: { 
          id: dispute._id, 
          status: dispute.status, 
          resolvedAt: dispute.disputeResolvedAt 
        }
      });

    } catch (error) {
      logger.error('Error resolving dispute', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve dispute',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get dispute statistics
router.get('/statistics',
  disputeRateLimit,
  authenticate,
  authorizeUserType(['admin']),
  [
    query('dateRange').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { dateRange, startDate, endDate } = req.query;
      
      let dateFilter = {};
      
      if (startDate && endDate) {
        dateFilter.disputedAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else if (dateRange) {
        const now = new Date();
        let start;
        
        switch (dateRange) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        if (start) {
          dateFilter.disputedAt = { $gte: start };
        }
      }

      const pipeline = [
        {
          $match: {
            status: { $in: ['disputed', 'released', 'refunded'] },
            disputedAt: { $exists: true },
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
            },
            resolved: {
              $sum: { $cond: [{ $in: ['$status', ['released', 'refunded']] }, 1, 0] }
            },
            refunded: {
              $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
            },
            released: {
              $sum: { $cond: [{ $eq: ['$status', 'released'] }, 1, 0] }
            },
            totalAmount: { $sum: '$amount' },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ['$disputeResolvedAt', null] },
                  {
                    $divide: [
                      { $subtract: ['$disputeResolvedAt', '$disputedAt'] },
                      1000 * 60 * 60 * 24 // Convert to days
                    ]
                  },
                  null
                ]
              }
            }
          }
        }
      ];

      const result = await EscrowTransaction.aggregate(pipeline);
      const stats = result[0] || {
        total: 0,
        pending: 0,
        resolved: 0,
        refunded: 0,
        released: 0,
        totalAmount: 0,
        avgResolutionTime: 0
      };

      // Calculate resolution rate
      const resolutionRate = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;

      res.json({
        success: true,
        data: {
          total: stats.total,
          pending: stats.pending,
          investigating: 0, // This would need to be tracked separately
          resolved: stats.resolved,
          rejected: 0, // This would need to be tracked separately
          escalated: 0, // This would need to be tracked separately
          highPriority: 0, // This would need priority field in schema
          averageResolutionTime: Math.round(stats.avgResolutionTime || 0),
          resolutionRate: Math.round(resolutionRate),
          totalAmount: stats.totalAmount
        }
      });

    } catch (error) {
      logger.error('Error fetching dispute statistics', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dispute statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;