const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType, requirePermission } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Get all reviews with admin filters (Admin only)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['approved', 'pending', 'rejected', 'flagged']).withMessage('Invalid status'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  query('product').optional().isMongoId().withMessage('Invalid product ID'),
  query('user').optional().isMongoId().withMessage('Invalid user ID'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy').optional().isIn(['createdAt', 'rating', 'updatedAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        rating,
        product,
        user,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (rating) filter.rating = parseInt(rating);
      if (product) filter.product = product;
      if (user) filter.user = user;
      if (search) {
        filter.$or = [
          { comment: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(filter)
          .populate('user', 'firstName lastName email profilePicture')
          .populate('product', 'name images seller')
          .populate('product.seller', 'businessName')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Review.countDocuments(filter)
      ]);

      // Log admin review access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_REVIEWS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        details: { 
          filter,
          totalResults: total,
          page: parseInt(page),
          limit: parseInt(limit)
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get reviews error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single review by ID (Admin only)
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const review = await Review.findById(req.params.id)
        .populate('user', 'firstName lastName email profilePicture accountStatus')
        .populate('product', 'name images description seller')
        .populate('product.seller', 'businessName email')
        .lean();

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Log admin review view
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_REVIEW_DETAILS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        resourceId: req.params.id,
        details: { 
          reviewId: review._id,
          productName: review.product?.name,
          userName: `${review.user?.firstName} ${review.user?.lastName}`
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: { review }
      });

    } catch (error) {
      logger.error('Admin get review error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update review status (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  body('status').isIn(['approved', 'pending', 'rejected', 'flagged']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      
      const review = await Review.findById(req.params.id)
        .populate('user', 'firstName lastName email')
        .populate('product', 'name');

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      const oldStatus = review.status;
      review.status = status;
      review.updatedAt = new Date();
      
      if (status === 'rejected' && reason) {
        review.rejectionReason = reason;
      }

      await review.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_REVIEW_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        resourceId: req.params.id,
        details: {
          reviewId: review._id,
          productName: review.product?.name,
          userName: `${review.user?.firstName} ${review.user?.lastName}`,
          oldStatus,
          newStatus: status,
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: `Review status updated to ${status}`,
        data: {
          review: {
            id: review._id,
            status: review.status,
            product: review.product,
            user: review.user
          }
        }
      });

    } catch (error) {
      logger.error('Admin update review status error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update review status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete review (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'review_management']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      const review = await Review.findById(req.params.id)
        .populate('user', 'firstName lastName email')
        .populate('product', 'name');

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Store review data for audit
      const reviewData = {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        user: review.user,
        product: review.product,
        status: review.status,
        createdAt: review.createdAt
      };

      await Review.findByIdAndDelete(req.params.id);

      // Log review deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_REVIEW',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        resourceId: req.params.id,
        details: {
          deletedReview: reviewData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'Review deleted successfully',
        data: { deletedReview: reviewData }
      });

    } catch (error) {
      logger.error('Admin delete review error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Bulk update reviews (Admin only)
router.patch('/bulk/update',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'review_management']),
  body('reviewIds').isArray({ min: 1 }).withMessage('Review IDs array is required'),
  body('reviewIds.*').isMongoId().withMessage('Invalid review ID'),
  body('action').isIn(['approve', 'reject', 'flag', 'delete']).withMessage('Invalid action'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reviewIds, action, reason } = req.body;

      let updateData = {};
      let newStatus = '';

      switch (action) {
        case 'approve':
          updateData = { status: 'approved', updatedAt: new Date() };
          newStatus = 'approved';
          break;
        case 'reject':
          updateData = { 
            status: 'rejected', 
            rejectionReason: reason || 'Rejected by admin',
            updatedAt: new Date() 
          };
          newStatus = 'rejected';
          break;
        case 'flag':
          updateData = { status: 'flagged', updatedAt: new Date() };
          newStatus = 'flagged';
          break;
      }

      let result;
      if (action === 'delete') {
        result = await Review.deleteMany({ _id: { $in: reviewIds } });
      } else {
        result = await Review.updateMany(
          { _id: { $in: reviewIds } },
          updateData
        );
      }

      // Log bulk action
      await AuditLog.logAction({
        action: `ADMIN_BULK_${action.toUpperCase()}_REVIEWS`,
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        details: {
          reviewIds,
          action,
          newStatus,
          reason: reason || 'No reason provided',
          affectedCount: result.modifiedCount || result.deletedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: {
          affectedCount: result.modifiedCount || result.deletedCount,
          action,
          newStatus
        }
      });

    } catch (error) {
      logger.error('Admin bulk update reviews error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get flagged/reported reviews (Admin only)
router.get('/reports/flagged',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      const [flaggedReviews, total] = await Promise.all([
        Review.find({ 
          $or: [
            { status: 'flagged' },
            { reportCount: { $gt: 0 } }
          ]
        })
          .populate('user', 'firstName lastName email')
          .populate('product', 'name seller')
          .populate('product.seller', 'businessName')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Review.countDocuments({ 
          $or: [
            { status: 'flagged' },
            { reportCount: { $gt: 0 } }
          ]
        })
      ]);

      // Log flagged reviews access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_FLAGGED_REVIEWS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        details: { 
          totalFlagged: total,
          page: parseInt(page),
          limit: parseInt(limit)
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          reviews: flaggedReviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get flagged reviews error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flagged reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get review statistics (Admin only)
router.get('/stats/summary',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Review.aggregate([
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            approvedReviews: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            pendingReviews: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            rejectedReviews: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            flaggedReviews: {
              $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] }
            },
            averageRating: { $avg: '$rating' },
            totalReports: { $sum: '$reportCount' }
          }
        }
      ]);

      // Get rating distribution
      const ratingDistribution = await Review.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Get recent reviews (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentReviews = await Review.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      const result = stats[0] || {
        totalReviews: 0,
        approvedReviews: 0,
        pendingReviews: 0,
        rejectedReviews: 0,
        flaggedReviews: 0,
        averageRating: 0,
        totalReports: 0
      };

      result.recentReviews = recentReviews;

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_REVIEW_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Review',
        details: { statisticsGenerated: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          summary: result,
          ratingDistribution
        }
      });

    } catch (error) {
      logger.error('Admin get review statistics error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch review statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;