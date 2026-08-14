const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType, requirePermission } = require('../middleware/auth');
const { handleValidationErrors, validatePagination } = require('../middleware/validation');
const logger = require('../utils/logger');

// Get all orders for admin management
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded']).withMessage('Invalid status'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
    query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
    query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
    query('minAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be positive'),
    query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Maximum amount must be positive'),
    query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
    query('reviewOfficer').optional().isMongoId().withMessage('Invalid review officer ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      const {
        status,
        search,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        paymentStatus,
        reviewOfficer
      } = req.query;

      // Build query
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      if (reviewOfficer) {
        query.reviewOfficer = reviewOfficer;
      }
      
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }
      
      if (minAmount || maxAmount) {
        query.totalAmount = {};
        if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
        if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
      }
      
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'shippingAddress.name': { $regex: search, $options: 'i' } },
          { 'shippingAddress.email': { $regex: search, $options: 'i' } },
          { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
        ];
      }

      // Fetch orders with populated fields
      const orders = await Order.find(query)
        .populate('buyer', 'firstName lastName email phone')
        .populate('items.product', 'name sku images')
        .populate('items.seller', 'businessName email')
        .populate({ path: 'reviewOfficer', select: 'firstName lastName email', strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalCount = await Order.countDocuments(query);

      // Log order access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_ORDERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Order',
        details: {
          query: req.query,
          resultCount: orders.length,
          totalCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      logger.error('Get admin orders error', error);
      res.status(500).json({
        error: 'Failed to fetch orders',
        message: 'An error occurred while fetching order data'
      });
    }
  }
);

router.get('/review-officers',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  async (req, res) => {
    try {
      const officers = await Admin.find({ role: 'review_officer', status: 'active' })
        .select('firstName lastName email role status')
        .sort({ firstName: 1, lastName: 1 });

      res.json({
        officers: officers.map((officer) => ({
          id: officer._id,
          name: `${officer.firstName || ''} ${officer.lastName || ''}`.trim(),
          email: officer.email || ''
        }))
      });
    } catch (error) {
      logger.error('Get review officers error', error);
      res.status(500).json({
        error: 'Failed to fetch review officers',
        message: 'An error occurred while fetching review officer data'
      });
    }
  }
);

// Get order by ID
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  param('id').isMongoId().withMessage('Invalid order ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id)
        .populate('buyer', 'firstName lastName email phone')
        .populate('items.product', 'name sku images price')
        .populate('items.seller', 'businessName email phone')
        .populate({ path: 'reviewOfficer', select: 'firstName lastName email', strictPopulate: false })
        .populate('escrow')
        .populate('refunds.requestedBy', 'firstName lastName email')
        .populate('refunds.processedBy', 'firstName lastName email');

      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          message: 'The requested order does not exist'
        });
      }

      // Log order view
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_ORDER_DETAILS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Order',
        resourceId: req.params.id,
        details: {
          orderNumber: order.orderNumber,
          orderStatus: order.status
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({ order });

    } catch (error) {
      logger.error('Get order by ID error', error);
      res.status(500).json({
        error: 'Failed to fetch order',
        message: 'An error occurred while fetching order details'
      });
    }
  }
);

// Update order status
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded']).withMessage('Invalid status'),
    body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
    body('trackingNumber').optional().isLength({ min: 1, max: 100 }).withMessage('Tracking number must be between 1 and 100 characters'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, reason, trackingNumber, notes } = req.body;
      
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          message: 'The requested order does not exist'
        });
      }

      const oldStatus = order.status;
      
      // Update order fields
      order.status = status;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (notes) order.notes = notes;
      order.updatedAt = new Date();

      // Add status history entry
      order.statusHistory.push({
        status,
        updatedBy: req.user.id,
        updatedByModel: 'Admin',
        reason: reason || `Status changed to ${status} by admin`,
        timestamp: new Date()
      });

      await order.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_ORDER_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Order',
        resourceId: req.params.id,
        details: {
          orderNumber: order.orderNumber,
          oldStatus,
          newStatus: status,
          reason: reason || 'No reason provided',
          trackingNumber,
          notes
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: 'Order status updated successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          trackingNumber: order.trackingNumber,
          updatedAt: order.updatedAt
        }
      });

    } catch (error) {
      logger.error('Update order status error', error);
      res.status(500).json({
        error: 'Failed to update order status',
        message: 'An error occurred while updating the order status'
      });
    }
  }
);

// Assign review officer to orders
router.post('/assign-reviewer',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  [
    body('orderIds').isArray({ min: 1 }).withMessage('Order IDs must be a non-empty array'),
    body('orderIds.*').isMongoId().withMessage('Invalid order ID'),
    body('reviewOfficerId').isMongoId().withMessage('Invalid review officer ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderIds, reviewOfficerId } = req.body;

      // Verify review officer exists and is an admin
      const reviewOfficer = await Admin.findById(reviewOfficerId);
      if (!reviewOfficer) {
        return res.status(404).json({
          error: 'Review officer not found',
          message: 'The specified review officer does not exist'
        });
      }

      // Update orders
      const result = await Order.updateMany(
        { _id: { $in: orderIds } },
        { 
          reviewOfficer: reviewOfficerId,
          updatedAt: new Date()
        }
      );

      // Log assignment
      await AuditLog.logAction({
        action: 'ADMIN_ASSIGN_REVIEW_OFFICER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Order',
        details: {
          orderIds,
          reviewOfficerId,
          reviewOfficerName: `${reviewOfficer.firstName} ${reviewOfficer.lastName}`,
          ordersUpdated: result.modifiedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: `Review officer assigned to ${result.modifiedCount} orders successfully`,
        assignedOrders: result.modifiedCount,
        reviewOfficer: {
          id: reviewOfficer._id,
          name: `${reviewOfficer.firstName} ${reviewOfficer.lastName}`,
          email: reviewOfficer.email
        }
      });

    } catch (error) {
      logger.error('Assign review officer error', error);
      res.status(500).json({
        error: 'Failed to assign review officer',
        message: 'An error occurred while assigning the review officer'
      });
    }
  }
);

// Bulk update orders
router.patch('/bulk-update',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  [
    body('orderIds').isArray({ min: 1 }).withMessage('Order IDs must be a non-empty array'),
    body('orderIds.*').isMongoId().withMessage('Invalid order ID'),
    body('updates').isObject().withMessage('Updates must be an object'),
    body('updates.status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded']).withMessage('Invalid status'),
    body('updates.reviewOfficer').optional().isMongoId().withMessage('Invalid review officer ID'),
    body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderIds, updates, reason } = req.body;

      // Validate review officer if provided
      if (updates.reviewOfficer) {
        const reviewOfficer = await Admin.findById(updates.reviewOfficer);
        if (!reviewOfficer) {
          return res.status(404).json({
            error: 'Review officer not found',
            message: 'The specified review officer does not exist'
          });
        }
      }

      // Update orders
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      const result = await Order.updateMany(
        { _id: { $in: orderIds } },
        updateData
      );

      // Log bulk update
      await AuditLog.logAction({
        action: 'ADMIN_BULK_UPDATE_ORDERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Order',
        details: {
          orderIds,
          updates,
          reason: reason || 'Bulk update performed',
          ordersUpdated: result.modifiedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: `${result.modifiedCount} orders updated successfully`,
        updatedOrders: result.modifiedCount
      });

    } catch (error) {
      logger.error('Bulk update orders error', error);
      res.status(500).json({
        error: 'Failed to bulk update orders',
        message: 'An error occurred while updating the orders'
      });
    }
  }
);

// Export orders
router.post('/export',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'order_management']),
  [
    body('format').isIn(['csv', 'excel', 'pdf']).withMessage('Invalid export format'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('dateRange').optional().isObject().withMessage('Date range must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { format, filters = {}, dateRange } = req.body;

      // Build query based on filters
      const query = {};
      
      if (filters.status) query.status = filters.status;
      if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
      if (dateRange) {
        query.createdAt = {};
        if (dateRange.startDate) query.createdAt.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) query.createdAt.$lte = new Date(dateRange.endDate);
      }

      // Fetch orders for export
      const orders = await Order.find(query)
        .populate('buyer', 'firstName lastName email')
        .populate('items.product', 'name sku')
        .populate('items.seller', 'businessName')
        .sort({ createdAt: -1 });

      // Log export
      await AuditLog.logAction({
        action: 'ADMIN_EXPORT_ORDERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Order',
        details: {
          format,
          filters,
          dateRange,
          exportedCount: orders.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // For now, return the data as JSON
      // In a real implementation, you would generate the actual file format
      res.json({
        message: 'Orders exported successfully',
        format,
        data: orders,
        count: orders.length,
        exportedAt: new Date()
      });

    } catch (error) {
      logger.error('Export orders error', error);
      res.status(500).json({
        error: 'Failed to export orders',
        message: 'An error occurred while exporting orders'
      });
    }
  }
);

module.exports = router;
