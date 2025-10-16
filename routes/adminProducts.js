const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
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

// Get all products with admin filters (Admin only)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive', 'pending', 'rejected']).withMessage('Invalid status'),
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('seller').optional().isMongoId().withMessage('Invalid seller ID'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'updatedAt', 'rating']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        seller,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (seller) filter.seller = seller;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('seller', 'businessName email contactInfo accountStatus')
          .populate('category', 'name')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Product.countDocuments(filter)
      ]);

      // Log admin product access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_PRODUCTS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
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
          products,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get products error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single product by ID (Admin only)
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('seller', 'businessName email contactInfo accountStatus isBusinessVerified')
        .populate('category', 'name parentCategory')
        .populate('reviews', 'rating comment user createdAt')
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Log admin product view
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_PRODUCT_DETAILS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: req.params.id,
        details: { productName: product.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: { product }
      });

    } catch (error) {
      logger.error('Admin get product error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update product status (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  body('status').isIn(['active', 'inactive', 'pending', 'rejected']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      
      const product = await Product.findById(req.params.id)
        .populate('seller', 'businessName email');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const oldStatus = product.status;
      product.status = status;
      product.updatedAt = new Date();
      
      if (status === 'rejected' && reason) {
        product.rejectionReason = reason;
      }

      await product.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_PRODUCT_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: req.params.id,
        details: {
          productName: product.name,
          sellerId: product.seller._id,
          sellerName: product.seller.businessName,
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
        message: `Product status updated to ${status}`,
        data: {
          product: {
            id: product._id,
            name: product.name,
            status: product.status,
            seller: product.seller
          }
        }
      });

    } catch (error) {
      logger.error('Admin update product status error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete product (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'product_management']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      const product = await Product.findById(req.params.id)
        .populate('seller', 'businessName email');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Store product data for audit
      const productData = {
        id: product._id,
        name: product.name,
        seller: product.seller,
        category: product.category,
        price: product.price,
        status: product.status
      };

      await Product.findByIdAndDelete(req.params.id);

      // Log product deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_PRODUCT',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: req.params.id,
        details: {
          deletedProduct: productData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: { deletedProduct: productData }
      });

    } catch (error) {
      logger.error('Admin delete product error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Bulk update products (Admin only)
router.patch('/bulk/update',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'product_management']),
  body('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required'),
  body('productIds.*').isMongoId().withMessage('Invalid product ID'),
  body('action').isIn(['activate', 'deactivate', 'approve', 'reject', 'delete']).withMessage('Invalid action'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productIds, action, reason } = req.body;

      let updateData = {};
      let newStatus = '';

      switch (action) {
        case 'activate':
          updateData = { status: 'active', updatedAt: new Date() };
          newStatus = 'active';
          break;
        case 'deactivate':
          updateData = { status: 'inactive', updatedAt: new Date() };
          newStatus = 'inactive';
          break;
        case 'approve':
          updateData = { status: 'active', updatedAt: new Date() };
          newStatus = 'active';
          break;
        case 'reject':
          updateData = { 
            status: 'rejected', 
            rejectionReason: reason || 'Rejected by admin',
            updatedAt: new Date() 
          };
          newStatus = 'rejected';
          break;
      }

      let result;
      if (action === 'delete') {
        result = await Product.deleteMany({ _id: { $in: productIds } });
      } else {
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          updateData
        );
      }

      // Log bulk action
      await AuditLog.logAction({
        action: `ADMIN_BULK_${action.toUpperCase()}_PRODUCTS`,
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        details: {
          productIds,
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
      logger.error('Admin bulk update products error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get product statistics (Admin only)
router.get('/stats/summary',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactiveProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            pendingProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            rejectedProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            averagePrice: { $avg: '$price' },
            totalValue: { $sum: '$price' }
          }
        }
      ]);

      // Get category distribution
      const categoryStats = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $project: {
            categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const result = stats[0] || {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        pendingProducts: 0,
        rejectedProducts: 0,
        averagePrice: 0,
        totalValue: 0
      };

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_PRODUCT_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        details: { statisticsGenerated: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          summary: result,
          categoryDistribution: categoryStats
        }
      });

    } catch (error) {
      logger.error('Admin get product statistics error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;