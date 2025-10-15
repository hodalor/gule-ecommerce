const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

// Import models
const { Admin, AdminSettings, AuditLog, User, Seller, Product, Order, Review } = require('../models');

// Import middleware
const { authenticate, authorizeUserType, requirePermission } = require('../middleware/auth');
const { 
  handleValidationErrors,
  validateAdminRegistration,
  sanitizeInput
} = require('../middleware/validation');

// Import utilities
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to generate employee ID
const generateEmployeeId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `GULE${currentYear}`;
  
  // Find the last employee ID for this year
  const lastAdmin = await Admin.findOne({
    employeeId: { $regex: `^${prefix}` }
  }).sort({ employeeId: -1 });

  let nextNumber = 1;
  if (lastAdmin && lastAdmin.employeeId) {
    const lastNumber = parseInt(lastAdmin.employeeId.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

// Helper function to generate PDF work ID
const generateWorkIdPDF = async (admin) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(20).text('GULE MARKETPLACE', { align: 'center' });
      doc.fontSize(16).text('Employee Work ID', { align: 'center' });
      doc.moveDown(2);

      // Employee Photo placeholder (if available)
      if (admin.profilePicture && admin.profilePicture.url) {
        // In a real implementation, you would fetch and embed the image
        doc.text('Photo: Available', 50, doc.y);
      } else {
        doc.text('Photo: Not Available', 50, doc.y);
      }
      doc.moveDown();

      // Employee Details
      doc.fontSize(12);
      doc.text(`Employee ID: ${admin.employeeId}`, 50, doc.y);
      doc.text(`Name: ${admin.firstName} ${admin.lastName}`, 50, doc.y + 20);
      doc.text(`Email: ${admin.email}`, 50, doc.y + 40);
      doc.text(`Phone: ${admin.phone || 'Not provided'}`, 50, doc.y + 60);
      doc.text(`Role: ${admin.role}`, 50, doc.y + 80);
      doc.text(`Department: ${admin.department || 'General'}`, 50, doc.y + 100);
      doc.text(`Hire Date: ${admin.hireDate ? admin.hireDate.toDateString() : 'Not specified'}`, 50, doc.y + 120);
      doc.text(`Status: ${admin.status}`, 50, doc.y + 140);

      // Generate QR Code with employee information
      const qrData = JSON.stringify({
        employeeId: admin.employeeId,
        name: `${admin.firstName} ${admin.lastName}`,
        role: admin.role,
        email: admin.email
      });

      QRCode.toDataURL(qrData, (err, qrCodeDataUrl) => {
        if (!err) {
          // In a real implementation, you would embed the QR code image
          doc.text('QR Code: Generated', 50, doc.y + 180);
        }
        
        // Footer
        doc.moveDown(3);
        doc.fontSize(10);
        doc.text('This is an official employee identification document.', { align: 'center' });
        doc.text(`Generated on: ${new Date().toDateString()}`, { align: 'center' });
        doc.text('Valid only with official company seal.', { align: 'center' });

        doc.end();
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Create new admin (Super Admin only)
router.post('/',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  validateAdminRegistration,
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        role,
        department,
        permissions,
        hireDate
      } = req.body;

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({
        $or: [{ email }, { phone }]
      });

      if (existingAdmin) {
        return res.status(409).json({
          error: 'Admin already exists',
          message: 'An admin with this email or phone number already exists'
        });
      }

      // Generate employee ID
      const employeeId = await generateEmployeeId();

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new admin
      const newAdmin = new Admin({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        employeeId,
        role,
        department,
        permissions: permissions || [],
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        status: 'active',
        createdBy: req.user.id,
        registrationDate: new Date()
      });

      await newAdmin.save();

      // Log admin creation
      await AuditLog.logAction({
        action: 'ADMIN_CREATE_ADMIN',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Admin',
        resourceId: newAdmin._id,
        details: {
          createdAdminId: newAdmin._id,
          employeeId,
          role,
          department,
          permissions
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      // Remove password from response
      const adminResponse = newAdmin.toObject();
      delete adminResponse.password;

      res.status(201).json({
        message: 'Admin created successfully',
        admin: adminResponse
      });

    } catch (error) {
      logger.error('Create admin error', error);
      res.status(500).json({
        error: 'Failed to create admin',
        message: 'An error occurred while creating the admin account'
      });
    }
  }
);

// Get all admins
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('role').optional().isIn(['super_admin', 'admin', 'moderator', 'support', 'finance', 'marketing']).withMessage('Invalid role'),
  query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  query('department').optional().isLength({ min: 1, max: 50 }).withMessage('Department must be between 1 and 50 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search;
      const role = req.query.role;
      const status = req.query.status;
      const department = req.query.department;

      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role) {
        query.role = role;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (department) {
        query.department = { $regex: department, $options: 'i' };
      }

      // Fetch admins
      const admins = await Admin.find(query)
        .select('-password')
        .sort({ registrationDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Admin.countDocuments(query);

      // Log admin access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_ADMINS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Admin',
        details: { 
          query: req.query,
          resultCount: admins.length,
          totalCount: total
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        admins,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      logger.error('Get admins error', error);
      res.status(500).json({
        error: 'Failed to fetch admins',
        message: 'An error occurred while fetching admin data'
      });
    }
  }
);

// Get admin by ID
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can view this admin profile
      const isOwnProfile = requestingUser.id === id;
      const canViewOthers = requestingUser.permissions.includes('user_management') || 
                           requestingUser.role === 'super_admin';

      if (!isOwnProfile && !canViewOthers) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view this admin profile'
        });
      }

      const admin = await Admin.findById(id).select('-password');

      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: 'The requested admin does not exist'
        });
      }

      // Log profile access
      await AuditLog.logAction({
        action: isOwnProfile ? 'ADMIN_VIEW_OWN_PROFILE' : 'ADMIN_VIEW_ADMIN_PROFILE',
        userId: requestingUser.id,
        userType: 'admin',
        resourceType: 'Admin',
        resourceId: id,
        details: { 
          viewedAdminId: id,
          isOwnProfile
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        admin
      });

    } catch (error) {
      logger.error('Get admin by ID error', error);
      res.status(500).json({
        error: 'Failed to fetch admin',
        message: 'An error occurred while fetching admin data'
      });
    }
  }
);

// Update admin
router.put('/:id',
  authenticate,
  authorizeUserType(['admin']),
  body('firstName').optional().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('role').optional().isIn(['super_admin', 'admin', 'moderator', 'support', 'finance', 'marketing']).withMessage('Invalid role'),
  body('department').optional().isLength({ min: 1, max: 50 }).withMessage('Department must be between 1 and 50 characters'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('hireDate').optional().isISO8601().withMessage('Invalid hire date'),
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can update this admin profile
      const isOwnProfile = requestingUser.id === id;
      const canUpdateOthers = requestingUser.permissions.includes('user_management') || 
                             requestingUser.role === 'super_admin';

      if (!isOwnProfile && !canUpdateOthers) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to update this admin profile'
        });
      }

      const admin = await Admin.findById(id);

      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: 'The requested admin does not exist'
        });
      }

      const {
        firstName,
        lastName,
        phone,
        role,
        department,
        permissions,
        hireDate
      } = req.body;

      // Store original data for audit
      const originalData = {
        firstName: admin.firstName,
        lastName: admin.lastName,
        phone: admin.phone,
        role: admin.role,
        department: admin.department,
        permissions: admin.permissions,
        hireDate: admin.hireDate
      };

      // Only super admins can change roles and permissions
      if ((role || permissions) && requestingUser.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only super admins can change roles and permissions'
        });
      }

      // Update fields
      if (firstName !== undefined) admin.firstName = firstName;
      if (lastName !== undefined) admin.lastName = lastName;
      if (phone !== undefined) {
        // Check if phone is already taken by another admin
        const existingAdmin = await Admin.findOne({ 
          phone, 
          _id: { $ne: id } 
        });
        
        if (existingAdmin) {
          return res.status(409).json({
            error: 'Phone number already exists',
            message: 'This phone number is already associated with another admin account'
          });
        }
        
        admin.phone = phone;
      }
      if (role !== undefined) admin.role = role;
      if (department !== undefined) admin.department = department;
      if (permissions !== undefined) admin.permissions = permissions;
      if (hireDate !== undefined) admin.hireDate = new Date(hireDate);

      admin.updatedAt = new Date();
      await admin.save();

      // Log profile update
      await AuditLog.logAction({
        action: isOwnProfile ? 'ADMIN_UPDATE_OWN_PROFILE' : 'ADMIN_UPDATE_ADMIN_PROFILE',
        userId: requestingUser.id,
        userType: 'admin',
        resourceType: 'Admin',
        resourceId: id,
        details: {
          updatedAdminId: id,
          originalData,
          updatedData: req.body,
          isOwnProfile
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // Remove password from response
      const adminResponse = admin.toObject();
      delete adminResponse.password;

      res.json({
        message: 'Admin profile updated successfully',
        admin: adminResponse
      });

    } catch (error) {
      logger.error('Update admin error', error);
      res.status(500).json({
        error: 'Failed to update admin',
        message: 'An error occurred while updating the admin profile'
      });
    }
  }
);

// Generate work ID PDF
router.get('/:id/work-id-pdf',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can generate work ID
      const isOwnProfile = requestingUser.id === id;
      const canGenerateForOthers = requestingUser.permissions.includes('user_management') || 
                                  requestingUser.role === 'super_admin';

      if (!isOwnProfile && !canGenerateForOthers) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to generate work ID for this admin'
        });
      }

      const admin = await Admin.findById(id).select('-password');

      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: 'The requested admin does not exist'
        });
      }

      // Generate PDF
      const pdfBuffer = await generateWorkIdPDF(admin);

      // Log work ID generation
      await AuditLog.logAction({
        action: 'ADMIN_GENERATE_WORK_ID_PDF',
        userId: requestingUser.id,
        userType: 'admin',
        resourceType: 'Admin',
        resourceId: id,
        details: {
          generatedForAdminId: id,
          employeeId: admin.employeeId,
          isOwnProfile
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="work-id-${admin.employeeId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      logger.error('Generate work ID PDF error', error);
      res.status(500).json({
        error: 'Failed to generate work ID',
        message: 'An error occurred while generating the work ID PDF'
      });
    }
  }
);

// Change admin status (Super Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin']),
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      // Prevent self-status change
      if (req.user.id === id) {
        return res.status(400).json({
          error: 'Cannot change own status',
          message: 'You cannot change your own account status'
        });
      }

      const admin = await Admin.findById(id);

      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: 'The requested admin does not exist'
        });
      }

      const oldStatus = admin.status;
      admin.status = status;
      admin.updatedAt = new Date();
      await admin.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_CHANGE_ADMIN_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Admin',
        resourceId: id,
        details: {
          changedAdminId: id,
          employeeId: admin.employeeId,
          oldStatus,
          newStatus: status,
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: `Admin status changed to ${status} successfully`,
        admin: {
          id: admin._id,
          employeeId: admin.employeeId,
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
          status: admin.status
        }
      });

    } catch (error) {
      logger.error('Change admin status error', error);
      res.status(500).json({
        error: 'Failed to change status',
        message: 'An error occurred while changing the admin status'
      });
    }
  }
);

// Delete admin (Super Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Prevent self-deletion
      if (req.user.id === id) {
        return res.status(400).json({
          error: 'Cannot delete own account',
          message: 'You cannot delete your own admin account'
        });
      }

      const admin = await Admin.findById(id);

      if (!admin) {
        return res.status(404).json({
          error: 'Admin not found',
          message: 'The requested admin does not exist'
        });
      }

      // Delete profile picture from Cloudinary if exists
      if (admin.profilePicture && admin.profilePicture.publicId) {
        try {
          await deleteFromCloudinary(admin.profilePicture.publicId);
        } catch (deleteError) {
          logger.warn('Failed to delete profile picture during admin deletion', deleteError);
        }
      }

      // Store admin data for audit before deletion
      const adminData = {
        id: admin._id,
        employeeId: admin.employeeId,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        role: admin.role,
        department: admin.department,
        registrationDate: admin.registrationDate
      };

      await Admin.findByIdAndDelete(id);

      // Log admin deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_ADMIN',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Admin',
        resourceId: id,
        details: {
          deletedAdmin: adminData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: 'Admin account deleted successfully',
        deletedAdmin: adminData
      });

    } catch (error) {
      logger.error('Delete admin error', error);
      res.status(500).json({
        error: 'Failed to delete admin',
        message: 'An error occurred while deleting the admin account'
      });
    }
  }
);

// Get system statistics (Admin only)
router.get('/system/statistics',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      // Get user statistics
      const buyerCount = await User.countDocuments();
    const activeBuyerCount = await User.countDocuments({ accountStatus: 'active' });
      const sellerCount = await Seller.countDocuments();
      const activeSellerCount = await Seller.countDocuments({ accountStatus: 'active' });
      const verifiedSellerCount = await Seller.countDocuments({ isBusinessVerified: true });

      // Get product statistics
      const productCount = await Product.countDocuments();
      const activeProductCount = await Product.countDocuments({ status: 'active' });
      const pendingProductCount = await Product.countDocuments({ status: 'pending' });

      // Get order statistics
      const orderStats = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]);

      // Get review statistics
      const reviewStats = await Review.aggregate([
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]);

      // Get recent activity counts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentBuyers = await User.countDocuments({
        registrationDate: { $gte: thirtyDaysAgo }
      });

      const recentSellers = await Seller.countDocuments({
        registrationDate: { $gte: thirtyDaysAgo }
      });

      const recentOrders = await Order.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      const statistics = {
        users: {
          buyers: {
            total: buyerCount,
            active: activeBuyerCount,
            recent: recentBuyers
          },
          sellers: {
            total: sellerCount,
            active: activeSellerCount,
            verified: verifiedSellerCount,
            recent: recentSellers
          }
        },
        products: {
          total: productCount,
          active: activeProductCount,
          pending: pendingProductCount
        },
        orders: orderStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          completedOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0
        },
        reviews: reviewStats[0] || {
          totalReviews: 0,
          averageRating: 0
        },
        recentActivity: {
          newBuyers: recentBuyers,
          newSellers: recentSellers,
          newOrders: recentOrders
        }
      };

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_SYSTEM_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'System',
        details: { statisticsGenerated: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        statistics
      });

    } catch (error) {
      logger.error('Get system statistics error', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'An error occurred while fetching system statistics'
      });
    }
  }
);

module.exports = router;