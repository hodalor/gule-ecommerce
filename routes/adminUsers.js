const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { authenticate, authorizeUserType, requirePermission } = require('../middleware/auth');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Get all users (Admin only)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('role').optional().isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller'),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      let query = {};
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      if (role) {
        query.userType = role;
      }

      if (status) {
        query.status = status;
      }

      // Fetch users
      const users = await User.find(query)
        .select('-password -emailVerificationToken -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      // Transform users for frontend
      const transformedUsers = users.map(user => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.userType,
        status: user.status,
        avatar: user.profilePicture,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        createdAt: user.createdAt,
        lastActive: user.lastLoginDate
      }));

      // Log admin access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_USERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        details: { 
          query: req.query,
          resultCount: users.length,
          totalCount: total
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        users: transformedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      logger.error('Get users error', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        message: 'An error occurred while fetching user data'
      });
    }
  }
);

// Create new user (Admin only)
router.post('/',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('role').isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const { name, email, phone, role, status = 'active', password, address, dateOfBirth, gender } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phone: phone || null }].filter(Boolean)
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email or phone number already exists'
        });
      }

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';


      // Create new user
      const newUser = new User({
        firstName,
        lastName,
        email,
        phone,
        password: password,
        userType: role,
        status,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        isEmailVerified: true, // Admin-created users are pre-verified
        createdBy: req.user.id,
        registrationDate: new Date()
      });

      await newUser.save();

      // Log user creation
      await AuditLog.logAction({
        action: 'ADMIN_CREATE_USER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        resourceId: newUser._id,
        details: {
          createdUserId: newUser._id,
          userType: role,
          email,
          phone
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // Transform user for response
      const userResponse = {
        id: newUser._id,
        name: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.userType,
        status: newUser.status,
        avatar: newUser.profilePicture,
        address: newUser.address,
        dateOfBirth: newUser.dateOfBirth,
        gender: newUser.gender,
        createdAt: newUser.createdAt,
        lastActive: newUser.lastLoginDate
      };

      res.status(201).json({
        message: 'User created successfully',
        user: userResponse
      });

    } catch (error) {
      logger.error('Create user error', error);
      res.status(500).json({
        error: 'Failed to create user',
        message: 'An error occurred while creating the user account'
      });
    }
  }
);

// Update user (Admin only)
router.put('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
  body('role').optional().isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, role, status, address, dateOfBirth, gender } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      // Check for email/phone conflicts
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email, _id: { $ne: id } });
        if (existingUser) {
          return res.status(409).json({
            error: 'Email already exists',
            message: 'Another user with this email already exists'
          });
        }
      }

      if (phone && phone !== user.phone) {
        const existingUser = await User.findOne({ phone, _id: { $ne: id } });
        if (existingUser) {
          return res.status(409).json({
            error: 'Phone already exists',
            message: 'Another user with this phone number already exists'
          });
        }
      }

      // Update user fields
      if (name) {
        const nameParts = name.trim().split(' ');
        user.firstName = nameParts[0];
        user.lastName = nameParts.slice(1).join(' ') || '';
      }
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (role) user.userType = role;
      if (status) user.status = status;
      if (address) user.address = address;
      if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
      if (gender) user.gender = gender;

      user.updatedAt = new Date();
      await user.save();

      // Log user update
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_USER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        resourceId: id,
        details: {
          updatedFields: Object.keys(req.body),
          previousValues: {
            email: user.email,
            phone: user.phone,
            status: user.status
          }
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // Transform user for response
      const userResponse = {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.userType,
        status: user.status,
        avatar: user.profilePicture,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        createdAt: user.createdAt,
        lastActive: user.lastLoginDate
      };

      res.json({
        message: 'User updated successfully',
        user: userResponse
      });

    } catch (error) {
      logger.error('Update user error', error);
      res.status(500).json({
        error: 'Failed to update user',
        message: 'An error occurred while updating the user'
      });
    }
  }
);

// Delete user (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      // Store user info for audit log
      const userInfo = {
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        status: user.status
      };

      await User.findByIdAndDelete(id);

      // Log user deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_USER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        resourceId: id,
        details: {
          deletedUser: userInfo
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Delete user error', error);
      res.status(500).json({
        error: 'Failed to delete user',
        message: 'An error occurred while deleting the user'
      });
    }
  }
);

// Suspend user (Admin only)
router.post('/:id/suspend',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      user.status = 'suspended';
      user.suspensionReason = reason;
      user.suspendedAt = new Date();
      user.suspendedBy = req.user.id;
      await user.save();

      // Log user suspension
      await AuditLog.logAction({
        action: 'ADMIN_SUSPEND_USER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        resourceId: id,
        details: {
          reason,
          previousStatus: user.status
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      // Transform user for response
      const userResponse = {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.userType,
        status: user.status,
        avatar: user.profilePicture,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        createdAt: user.createdAt,
        lastActive: user.lastLoginDate
      };

      res.json({
        message: 'User suspended successfully',
        user: userResponse
      });

    } catch (error) {
      logger.error('Suspend user error', error);
      res.status(500).json({
        error: 'Failed to suspend user',
        message: 'An error occurred while suspending the user'
      });
    }
  }
);

// Activate user (Admin only)
router.post('/:id/activate',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
      }

      const previousStatus = user.status;
      user.status = 'active';
      user.suspensionReason = undefined;
      user.suspendedAt = undefined;
      user.suspendedBy = undefined;
      await user.save();

      // Log user activation
      await AuditLog.logAction({
        action: 'ADMIN_ACTIVATE_USER',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        resourceId: id,
        details: {
          previousStatus
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // Transform user for response
      const userResponse = {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        role: user.userType,
        status: user.status,
        avatar: user.profilePicture,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        createdAt: user.createdAt,
        lastActive: user.lastLoginDate
      };

      res.json({
        message: 'User activated successfully',
        user: userResponse
      });

    } catch (error) {
      logger.error('Activate user error', error);
      res.status(500).json({
        error: 'Failed to activate user',
        message: 'An error occurred while activating the user'
      });
    }
  }
);

// Bulk update users (Admin only)
router.post('/bulk',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('action').isIn(['suspend', 'activate', 'delete']).withMessage('Invalid action'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const { userIds, action, data } = req.body;

      let result;
      switch (action) {
        case 'suspend':
          result = await User.updateMany(
            { _id: { $in: userIds } },
            { 
              status: 'suspended',
              suspensionReason: data?.reason,
              suspendedAt: new Date(),
              suspendedBy: req.user.id
            }
          );
          break;
        case 'activate':
          result = await User.updateMany(
            { _id: { $in: userIds } },
            { 
              status: 'active',
              $unset: { suspensionReason: 1, suspendedAt: 1, suspendedBy: 1 }
            }
          );
          break;
        case 'delete':
          result = await User.deleteMany({ _id: { $in: userIds } });
          break;
      }

      // Log bulk action
      await AuditLog.logAction({
        action: `ADMIN_BULK_${action.toUpperCase()}_USERS`,
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        details: {
          userIds,
          action,
          data,
          affectedCount: result.modifiedCount || result.deletedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: `Bulk ${action} completed successfully`,
        affectedCount: result.modifiedCount || result.deletedCount
      });

    } catch (error) {
      logger.error('Bulk update users error', error);
      res.status(500).json({
        error: 'Failed to perform bulk action',
        message: 'An error occurred while performing the bulk action'
      });
    }
  }
);

// Export users (Admin only)
router.get('/export',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'user_management']),
  async (req, res) => {
    try {
      const { role, status, search } = req.query;

      // Build query
      let query = {};
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      if (role) {
        query.userType = role;
      }

      if (status) {
        query.status = status;
      }

      // Fetch users for export
      const users = await User.find(query)
        .select('-password -emailVerificationToken -passwordResetToken')
        .sort({ createdAt: -1 });

      // Transform users for CSV export
      const csvData = users.map(user => ({
        ID: user._id,
        Name: `${user.firstName} ${user.lastName}`,
        Email: user.email,
        Phone: user.phone || '',
        Role: user.userType,
        Status: user.status,
        'Join Date': user.createdAt.toISOString().split('T')[0],
        'Last Active': user.lastLoginDate ? user.lastLoginDate.toISOString().split('T')[0] : 'Never',
        Address: user.address || '',
        Gender: user.gender || ''
      }));

      // Log export action
      await AuditLog.logAction({
        action: 'ADMIN_EXPORT_USERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'User',
        details: {
          query: req.query,
          exportCount: users.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: 'Users exported successfully',
        data: csvData,
        count: csvData.length
      });

    } catch (error) {
      logger.error('Export users error', error);
      res.status(500).json({
        error: 'Failed to export users',
        message: 'An error occurred while exporting user data'
      });
    }
  }
);

module.exports = router;