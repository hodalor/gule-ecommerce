const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting
const complaintRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each user to 20 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many complaint requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Create new complaint
router.post('/',
  complaintRateLimit,
  authenticate,
  [
    body('type').isIn(['product', 'service', 'delivery', 'payment', 'seller', 'technical', 'other']),
    body('category').isIn(['quality', 'shipping', 'customer_service', 'billing', 'fraud', 'bug', 'feature_request', 'other']),
    body('subject').isString().trim().isLength({ min: 5, max: 200 }),
    body('description').isString().trim().isLength({ min: 10, max: 2000 }),
    body('orderId').optional().isMongoId(),
    body('productId').optional().isMongoId(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const complaintData = {
        ...req.body,
        userId: req.user.id
      };

      const complaint = new Complaint(complaintData);
      await complaint.save();

      await complaint.populate([
        { path: 'userId', select: 'username email' },
        { path: 'orderId', select: 'orderNumber status' },
        { path: 'productId', select: 'name images' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully',
        data: complaint
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create complaint',
        error: error.message
      });
    }
  }
);

// Get user's complaints
router.get('/my-complaints',
  authenticate,
  [
    query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed', 'escalated']),
    query('type').optional().isIn(['product', 'service', 'delivery', 'payment', 'seller', 'technical', 'other']),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, sort = '-createdAt' } = req.query;
      const skip = (page - 1) * limit;

      const filter = { userId: req.user.id };
      if (status) filter.status = status;
      if (type) filter.type = type;

      const complaints = await Complaint.find(filter)
        .populate([
          { path: 'orderId', select: 'orderNumber status totalAmount' },
          { path: 'productId', select: 'name images price' },
          { path: 'assignedTo', select: 'username email' }
        ])
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Complaint.countDocuments(filter);

      res.json({
        success: true,
        data: {
          complaints,
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
        message: 'Failed to fetch complaints',
        error: error.message
      });
    }
  }
);

// Get complaint by ID
router.get('/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id)
        .populate([
          { path: 'userId', select: 'username email phone' },
          { path: 'orderId', select: 'orderNumber status totalAmount createdAt' },
          { path: 'productId', select: 'name images price seller' },
          { path: 'assignedTo', select: 'username email' },
          { path: 'responses.respondedBy', select: 'username email' }
        ]);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      // Check if user can access this complaint
      const canAccess = complaint.userId._id.toString() === req.user.id || 
                       req.user.userType === 'admin' ||
                       (req.user.userType === 'seller' && complaint.productId?.seller?.toString() === req.user.id);

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: complaint
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch complaint',
        error: error.message
      });
    }
  }
);

// Add response to complaint
router.post('/:id/response',
  authenticate,
  [
    param('id').isMongoId(),
    body('message').isString().trim().isLength({ min: 10, max: 1000 }),
    body('isInternal').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      // Check permissions
      const canRespond = complaint.userId.toString() === req.user.id || 
                        req.user.userType === 'admin' ||
                        complaint.assignedTo?.toString() === req.user.id;

      if (!canRespond) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const response = {
        message: req.body.message,
        respondedBy: req.user.id,
        isInternal: req.body.isInternal || false
      };

      complaint.responses.push(response);
      
      // Update status if it's the first response from admin/support
      if (req.user.userType === 'admin' && complaint.status === 'open') {
        complaint.status = 'in_progress';
      }

      await complaint.save();

      await complaint.populate([
        { path: 'responses.respondedBy', select: 'username email' }
      ]);

      res.json({
        success: true,
        message: 'Response added successfully',
        data: complaint
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to add response',
        error: error.message
      });
    }
  }
);

// Update complaint status (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId(),
    body('status').isIn(['open', 'in_progress', 'resolved', 'closed', 'escalated']),
    body('resolution').optional().isString().trim().isLength({ max: 1000 }),
    body('satisfactionRating').optional().isInt({ min: 1, max: 5 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, resolution, satisfactionRating } = req.body;

      const updateData = { status };
      
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
        if (resolution) updateData.resolution = resolution;
        if (satisfactionRating) updateData.satisfactionRating = satisfactionRating;
      }

      const complaint = await Complaint.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate([
        { path: 'userId', select: 'username email' },
        { path: 'assignedTo', select: 'username email' }
      ]);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      res.json({
        success: true,
        message: 'Complaint status updated successfully',
        data: complaint
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update complaint status',
        error: error.message
      });
    }
  }
);

// Assign complaint to admin (Admin only)
router.patch('/:id/assign',
  authenticate,
  authorizeUserType(['admin']),
  [
    param('id').isMongoId(),
    body('assignedTo').isMongoId()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const complaint = await Complaint.findByIdAndUpdate(
        req.params.id,
        { 
          assignedTo: req.body.assignedTo,
          status: 'in_progress'
        },
        { new: true }
      ).populate([
        { path: 'userId', select: 'username email' },
        { path: 'assignedTo', select: 'username email' }
      ]);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      res.json({
        success: true,
        message: 'Complaint assigned successfully',
        data: complaint
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to assign complaint',
        error: error.message
      });
    }
  }
);

// Get complaint statistics (Admin only)
router.get('/admin/statistics',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Complaint.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            avgSatisfactionRating: { $avg: '$satisfactionRating' }
          }
        }
      ]);

      const typeStats = await Complaint.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const categoryStats = await Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {},
          byType: typeStats,
          byCategory: categoryStats
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch complaint statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;