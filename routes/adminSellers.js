const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Order = require('../models/Order');
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

// Get all sellers with admin filters (Admin only)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
  query('verified').optional().isBoolean().withMessage('Verified must be boolean'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy').optional().isIn(['businessName', 'email', 'registrationDate', 'lastLogin']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        verified,
        search,
        sortBy = 'registrationDate',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      if (status) filter.accountStatus = status;
      if (verified !== undefined) filter.isBusinessVerified = verified === 'true';
      if (search) {
        filter.$or = [
          { businessName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'contactInfo.phone': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [sellers, total] = await Promise.all([
        Seller.find(filter)
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Seller.countDocuments(filter)
      ]);

      // Get additional stats for each seller
      const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
          const [productCount, orderCount] = await Promise.all([
            Product.countDocuments({ seller: seller._id }),
            Order.countDocuments({ 'items.seller': seller._id })
          ]);

          return {
            ...seller,
            stats: {
              totalProducts: productCount,
              totalOrders: orderCount
            }
          };
        })
      );

      // Log admin seller access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_SELLERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
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
          sellers: sellersWithStats,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get sellers error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sellers',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single seller by ID (Admin only)
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const seller = await Seller.findById(req.params.id)
        .select('-password')
        .lean();

      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      // Get seller statistics
      const [productStats, orderStats, revenueStats] = await Promise.all([
        Product.aggregate([
          { $match: { seller: seller._id } },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              activeProducts: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              pendingProducts: {
                $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
              }
            }
          }
        ]),
        Order.aggregate([
          { $match: { 'items.seller': seller._id } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              completedOrders: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          }
        ]),
        Order.aggregate([
          { $match: { 'items.seller': seller._id, status: 'completed' } },
          { $unwind: '$items' },
          { $match: { 'items.seller': seller._id } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          }
        ])
      ]);

      const sellerWithStats = {
        ...seller,
        stats: {
          products: productStats[0] || { totalProducts: 0, activeProducts: 0, pendingProducts: 0 },
          orders: orderStats[0] || { totalOrders: 0, completedOrders: 0 },
          revenue: revenueStats[0] || { totalRevenue: 0 }
        }
      };

      // Log admin seller view
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_SELLER_DETAILS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: req.params.id,
        details: { sellerName: seller.businessName },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: { seller: sellerWithStats }
      });

    } catch (error) {
      logger.error('Admin get seller error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update seller status (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  body('status').isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      
      const seller = await Seller.findById(req.params.id);

      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      const oldStatus = seller.accountStatus;
      seller.accountStatus = status;
      seller.updatedAt = new Date();
      
      if (status === 'suspended' && reason) {
        seller.suspensionReason = reason;
      }

      await seller.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_SELLER_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: req.params.id,
        details: {
          sellerName: seller.businessName,
          sellerEmail: seller.email,
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
        message: `Seller status updated to ${status}`,
        data: {
          seller: {
            id: seller._id,
            businessName: seller.businessName,
            email: seller.email,
            accountStatus: seller.accountStatus
          }
        }
      });

    } catch (error) {
      logger.error('Admin update seller status error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update seller status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Verify seller business (Admin only)
router.patch('/:id/verify',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'seller_management']),
  body('verified').isBoolean().withMessage('Verified status must be boolean'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { verified, reason } = req.body;
      
      const seller = await Seller.findById(req.params.id);

      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      const wasVerified = seller.isBusinessVerified;
      seller.isBusinessVerified = verified;
      seller.verificationDate = verified ? new Date() : null;
      seller.updatedAt = new Date();

      if (!verified && reason) {
        seller.verificationRejectionReason = reason;
      }

      await seller.save();

      // Log verification change
      await AuditLog.logAction({
        action: verified ? 'ADMIN_VERIFY_SELLER_BUSINESS' : 'ADMIN_UNVERIFY_SELLER_BUSINESS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: req.params.id,
        details: {
          sellerName: seller.businessName,
          sellerEmail: seller.email,
          wasVerified,
          nowVerified: verified,
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: `Seller business ${verified ? 'verified' : 'unverified'} successfully`,
        data: {
          seller: {
            id: seller._id,
            businessName: seller.businessName,
            email: seller.email,
            isBusinessVerified: seller.isBusinessVerified,
            verificationDate: seller.verificationDate
          }
        }
      });

    } catch (error) {
      logger.error('Admin verify seller error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update seller verification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete seller (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      const seller = await Seller.findById(req.params.id);

      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      // Check if seller has active orders
      const activeOrders = await Order.countDocuments({
        'items.seller': seller._id,
        status: { $in: ['pending', 'processing', 'shipped'] }
      });

      if (activeOrders > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete seller with active orders',
          data: { activeOrdersCount: activeOrders }
        });
      }

      // Store seller data for audit
      const sellerData = {
        id: seller._id,
        businessName: seller.businessName,
        email: seller.email,
        accountStatus: seller.accountStatus,
        isBusinessVerified: seller.isBusinessVerified,
        registrationDate: seller.registrationDate
      };

      await Seller.findByIdAndDelete(req.params.id);

      // Log seller deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_SELLER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: req.params.id,
        details: {
          deletedSeller: sellerData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'Seller deleted successfully',
        data: { deletedSeller: sellerData }
      });

    } catch (error) {
      logger.error('Admin delete seller error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete seller',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Bulk update sellers (Admin only)
router.patch('/bulk/update',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'seller_management']),
  body('sellerIds').isArray({ min: 1 }).withMessage('Seller IDs array is required'),
  body('sellerIds.*').isMongoId().withMessage('Invalid seller ID'),
  body('action').isIn(['activate', 'deactivate', 'suspend', 'verify', 'unverify']).withMessage('Invalid action'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { sellerIds, action, reason } = req.body;

      let updateData = {};
      let newStatus = '';

      switch (action) {
        case 'activate':
          updateData = { accountStatus: 'active', updatedAt: new Date() };
          newStatus = 'active';
          break;
        case 'deactivate':
          updateData = { accountStatus: 'inactive', updatedAt: new Date() };
          newStatus = 'inactive';
          break;
        case 'suspend':
          updateData = { 
            accountStatus: 'suspended', 
            suspensionReason: reason || 'Suspended by admin',
            updatedAt: new Date() 
          };
          newStatus = 'suspended';
          break;
        case 'verify':
          updateData = { 
            isBusinessVerified: true, 
            verificationDate: new Date(),
            updatedAt: new Date() 
          };
          newStatus = 'verified';
          break;
        case 'unverify':
          updateData = { 
            isBusinessVerified: false, 
            verificationDate: null,
            verificationRejectionReason: reason || 'Unverified by admin',
            updatedAt: new Date() 
          };
          newStatus = 'unverified';
          break;
      }

      const result = await Seller.updateMany(
        { _id: { $in: sellerIds } },
        updateData
      );

      // Log bulk action
      await AuditLog.logAction({
        action: `ADMIN_BULK_${action.toUpperCase()}_SELLERS`,
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        details: {
          sellerIds,
          action,
          newStatus,
          reason: reason || 'No reason provided',
          affectedCount: result.modifiedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: {
          affectedCount: result.modifiedCount,
          action,
          newStatus
        }
      });

    } catch (error) {
      logger.error('Admin bulk update sellers error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get seller statistics (Admin only)
router.get('/stats/summary',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Seller.aggregate([
        {
          $group: {
            _id: null,
            totalSellers: { $sum: 1 },
            activeSellers: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'active'] }, 1, 0] }
            },
            inactiveSellers: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'inactive'] }, 1, 0] }
            },
            suspendedSellers: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'suspended'] }, 1, 0] }
            },
            verifiedSellers: {
              $sum: { $cond: [{ $eq: ['$isBusinessVerified', true] }, 1, 0] }
            },
            pendingSellers: {
              $sum: { $cond: [{ $eq: ['$accountStatus', 'pending'] }, 1, 0] }
            }
          }
        }
      ]);

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRegistrations = await Seller.countDocuments({
        registrationDate: { $gte: thirtyDaysAgo }
      });

      const result = stats[0] || {
        totalSellers: 0,
        activeSellers: 0,
        inactiveSellers: 0,
        suspendedSellers: 0,
        verifiedSellers: 0,
        pendingSellers: 0
      };

      result.recentRegistrations = recentRegistrations;

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_SELLER_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        details: { statisticsGenerated: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Admin get seller statistics error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;