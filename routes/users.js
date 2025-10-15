const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Import models
const { User, AdminSettings, AuditLog, Order, Review } = require('../models');

// Import middleware
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { 
  handleValidationErrors,
  validateProfileUpdate,
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

// Helper function to get privacy settings
const getPrivacySettings = async () => {
  try {
    const settings = await AdminSettings.find({
      category: 'privacy',
      status: 'active'
    });
    
    const privacyMap = {};
    settings.forEach(setting => {
      privacyMap[setting.settingKey] = setting.value;
    });
    
    return privacyMap;
  } catch (error) {
    logger.error('Failed to fetch privacy settings', error);
    return {};
  }
};

// Helper function to filter user data based on privacy settings
const filterUserData = (user, privacySettings, isOwnProfile = false) => {
  const userData = user.toObject();
  
  // Always remove sensitive fields
  delete userData.password;
  delete userData.emailVerificationToken;
  delete userData.emailVerificationExpires;
  delete userData.passwordResetToken;
  delete userData.passwordResetExpires;
  
  // If it's the user's own profile, return all allowed data
  if (isOwnProfile) {
    return userData;
  }
  
  // Apply privacy filters based on admin settings
  if (privacySettings.hideEmail === 'true') {
    delete userData.email;
  }
  
  if (privacySettings.hidePhone === 'true') {
    delete userData.phone;
  }
  
  if (privacySettings.hideDateOfBirth === 'true') {
    delete userData.dateOfBirth;
  }
  
  if (privacySettings.hideAddress === 'true') {
    delete userData.address;
  }
  
  if (privacySettings.hideLastLogin === 'true') {
    delete userData.lastLoginDate;
  }
  
  if (privacySettings.hideRegistrationDate === 'true') {
    delete userData.registrationDate;
  }
  
  // Always hide sensitive account information from other users
  delete userData.accountStatus;
  delete userData.loginAttempts;
  delete userData.lockUntil;
  delete userData.preferences;
  delete userData.wishlist;
  delete userData.cart;
  
  return userData;
};

// Get all buyers (Admin only with privacy filtering)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('status').optional().isIn(['active', 'suspended', 'deactivated']).withMessage('Invalid status'),
  query('verified').optional().isBoolean().withMessage('Verified must be a boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search;
      const status = req.query.status;
      const verified = req.query.verified;

      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        query.accountStatus = status;
      }
      
      if (verified !== undefined) {
        query.isEmailVerified = verified === 'true';
      }

      // Get privacy settings
      const privacySettings = await getPrivacySettings();

      // Fetch buyers
      const buyers = await User.find(query)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
        .sort({ registrationDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      // Apply privacy filtering
      const filteredBuyers = buyers.map(buyer => 
        filterUserData(buyer, privacySettings, false)
      );

      // Log admin access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_BUYERS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Buyer',
        details: { 
          query: req.query,
          resultCount: buyers.length,
          totalCount: total
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        buyers: filteredBuyers,
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
      logger.error('Get buyers error', error);
      res.status(500).json({
        error: 'Failed to fetch buyers',
        message: 'An error occurred while fetching buyer data'
      });
    }
  }
);

// Get buyer by ID
router.get('/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      const buyer = await User.findById(id)
         .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      // Check if user can view this profile
      const isOwnProfile = requestingUser.userType === 'buyer' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        // Get privacy settings for public view
        const privacySettings = await getPrivacySettings();
        
        // Check if public profiles are allowed
        if (privacySettings.allowPublicProfiles !== 'true') {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to view this profile'
          });
        }
      }

      // Get privacy settings and filter data
      const privacySettings = await getPrivacySettings();
      const filteredBuyer = filterUserData(buyer, privacySettings, isOwnProfile || isAdmin);

      // Log profile access
      await AuditLog.logAction({
        action: isOwnProfile ? 'USER_VIEW_OWN_PROFILE' : 'USER_VIEW_PROFILE',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Buyer',
        resourceId: id,
        details: { 
          viewedUserId: id,
          isOwnProfile,
          isAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        buyer: filteredBuyer
      });

    } catch (error) {
      logger.error('Get buyer by ID error', error);
      res.status(500).json({
        error: 'Failed to fetch buyer',
        message: 'An error occurred while fetching buyer data'
      });
    }
  }
);

// Update buyer profile
router.put('/:id',
  authenticate,
  validateProfileUpdate,
  handleValidationErrors,
  sanitizeInput,
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can update this profile
      const isOwnProfile = requestingUser.userType === 'buyer' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to update this profile'
        });
      }

      const buyer = await User.findById(id);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        address,
        preferences
      } = req.body;

      // Store original data for audit
      const originalData = {
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone,
        dateOfBirth: buyer.dateOfBirth,
        address: buyer.address,
        preferences: buyer.preferences
      };

      // Update fields
      if (firstName !== undefined) buyer.firstName = firstName;
      if (lastName !== undefined) buyer.lastName = lastName;
      if (phone !== undefined) {
        // Check if phone is already taken by another user
        const existingUser = await User.findOne({ 
          phone, 
          _id: { $ne: id } 
        });
        
        if (existingUser) {
          return res.status(409).json({
            error: 'Phone number already exists',
            message: 'This phone number is already associated with another account'
          });
        }
        
        buyer.phone = phone;
        buyer.isPhoneVerified = false; // Reset verification status
      }
      if (dateOfBirth !== undefined) buyer.dateOfBirth = dateOfBirth;
      if (address !== undefined) buyer.address = address;
      if (preferences !== undefined) buyer.preferences = { ...buyer.preferences, ...preferences };

      buyer.updatedAt = new Date();
      await buyer.save();

      // Log profile update
      await AuditLog.logAction({
        action: isOwnProfile ? 'USER_UPDATE_OWN_PROFILE' : 'ADMIN_UPDATE_USER_PROFILE',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Buyer',
        resourceId: id,
        details: {
          updatedUserId: id,
          originalData,
          updatedData: req.body,
          isOwnProfile,
          isAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      // Get privacy settings and filter response data
      const privacySettings = await getPrivacySettings();
      const filteredBuyer = filterUserData(buyer, privacySettings, isOwnProfile || isAdmin);

      res.json({
        message: 'Profile updated successfully',
        buyer: filteredBuyer
      });

    } catch (error) {
      logger.error('Update buyer profile error', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: 'An error occurred while updating the profile'
      });
    }
  }
);

// Upload profile picture
router.post('/:id/profile-picture',
  authenticate,
  upload.single('profilePicture'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can update this profile
      const isOwnProfile = requestingUser.userType === 'buyer' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to update this profile picture'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a profile picture to upload'
        });
      }

      const buyer = await User.findById(id);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      // Delete old profile picture if exists
      if (buyer.profilePicture && buyer.profilePicture.publicId) {
        try {
          await deleteFromCloudinary(buyer.profilePicture.publicId);
        } catch (deleteError) {
          logger.warn('Failed to delete old profile picture', deleteError);
        }
      }

      // Upload new profile picture
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: 'gule/profiles/buyers',
        public_id: `buyer_${id}_${Date.now()}`,
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });

      // Update buyer profile picture
      buyer.profilePicture = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
      buyer.updatedAt = new Date();
      await buyer.save();

      // Log profile picture update
      await AuditLog.logAction({
        action: 'USER_UPDATE_PROFILE_PICTURE',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Buyer',
        resourceId: id,
        details: {
          updatedUserId: id,
          profilePictureUrl: uploadResult.secure_url,
          isOwnProfile,
          isAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        message: 'Profile picture updated successfully',
        profilePicture: buyer.profilePicture
      });

    } catch (error) {
      logger.error('Upload profile picture error', error);
      res.status(500).json({
        error: 'Failed to upload profile picture',
        message: 'An error occurred while uploading the profile picture'
      });
    }
  }
);

// Delete profile picture
router.delete('/:id/profile-picture',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can update this profile
      const isOwnProfile = requestingUser.userType === 'buyer' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to delete this profile picture'
        });
      }

      const buyer = await User.findById(id);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      if (!buyer.profilePicture || !buyer.profilePicture.publicId) {
        return res.status(404).json({
          error: 'No profile picture found',
          message: 'This user does not have a profile picture to delete'
        });
      }

      // Delete from Cloudinary
      try {
        await deleteFromCloudinary(buyer.profilePicture.publicId);
      } catch (deleteError) {
        logger.warn('Failed to delete profile picture from Cloudinary', deleteError);
      }

      // Remove from database
      buyer.profilePicture = undefined;
      buyer.updatedAt = new Date();
      await buyer.save();

      // Log profile picture deletion
      await AuditLog.logAction({
        action: 'USER_DELETE_PROFILE_PICTURE',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Buyer',
        resourceId: id,
        details: {
          deletedUserId: id,
          isOwnProfile,
          isAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        message: 'Profile picture deleted successfully'
      });

    } catch (error) {
      logger.error('Delete profile picture error', error);
      res.status(500).json({
        error: 'Failed to delete profile picture',
        message: 'An error occurred while deleting the profile picture'
      });
    }
  }
);

// Change password
router.put('/:id/password',
  authenticate,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      const requestingUser = req.user;

      // Only allow users to change their own password (admins should use admin routes)
      if (requestingUser.userType !== 'buyer' || requestingUser.id !== id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only change your own password'
        });
      }

      const buyer = await User.findById(id).select('+password');

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, buyer.password);

      if (!isCurrentPasswordValid) {
        await AuditLog.logAction({
          action: 'PASSWORD_CHANGE_ATTEMPT_INVALID_CURRENT',
          userId: requestingUser.id,
          userType: 'buyer',
          resourceType: 'Buyer',
          resourceId: id,
          details: { reason: 'invalid_current_password' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

        return res.status(400).json({
          error: 'Invalid current password',
          message: 'The current password you entered is incorrect'
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      buyer.password = hashedNewPassword;
      buyer.updatedAt = new Date();
      await buyer.save();

      // Log password change
      await AuditLog.logAction({
        action: 'USER_PASSWORD_CHANGED',
        userId: requestingUser.id,
        userType: 'buyer',
        resourceType: 'Buyer',
        resourceId: id,
        details: { passwordChangedAt: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error', error);
      res.status(500).json({
        error: 'Failed to change password',
        message: 'An error occurred while changing the password'
      });
    }
  }
);

// Get buyer statistics (Admin only)
router.get('/:id/statistics',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const buyer = await User.findById(id);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      // Get order statistics
      const orderStats = await Order.aggregate([
        { $match: { buyer: buyer._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]);

      // Get review statistics
      const reviewStats = await Review.aggregate([
        { $match: { buyer: buyer._id } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' }
          }
        }
      ]);

      const statistics = {
        buyer: {
          id: buyer._id,
          name: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email,
          registrationDate: buyer.registrationDate,
          lastLoginDate: buyer.lastLoginDate,
          accountStatus: buyer.accountStatus
        },
        orders: orderStats[0] || {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          completedOrders: 0,
          cancelledOrders: 0
        },
        reviews: reviewStats[0] || {
          totalReviews: 0,
          averageRating: 0
        }
      };

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_BUYER_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Buyer',
        resourceId: id,
        details: { viewedBuyerId: id },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        statistics
      });

    } catch (error) {
      logger.error('Get buyer statistics error', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'An error occurred while fetching buyer statistics'
      });
    }
  }
);

// Suspend/Unsuspend buyer (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  body('status').isIn(['active', 'suspended', 'deactivated']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const buyer = await User.findById(id);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      const oldStatus = buyer.accountStatus;
      buyer.accountStatus = status;
      buyer.updatedAt = new Date();
      await buyer.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_CHANGE_BUYER_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Buyer',
        resourceId: id,
        details: {
          buyerId: id,
          oldStatus,
          newStatus: status,
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: `Buyer account ${status} successfully`,
        buyer: {
          id: buyer._id,
          name: `${buyer.firstName} ${buyer.lastName}`,
          email: buyer.email,
          accountStatus: buyer.accountStatus
        }
      });

    } catch (error) {
      logger.error('Change buyer status error', error);
      res.status(500).json({
        error: 'Failed to change status',
        message: 'An error occurred while changing the buyer status'
      });
    }
  }
);

// Delete buyer account (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const buyer = await User.findById(id);

      if (!buyer) {
        return res.status(404).json({
          error: 'Buyer not found',
          message: 'The requested buyer does not exist'
        });
      }

      // Check for active orders
      const activeOrders = await Order.countDocuments({
        buyer: id,
        status: { $in: ['pending', 'processing', 'shipped'] }
      });

      if (activeOrders > 0) {
        return res.status(400).json({
          error: 'Cannot delete account',
          message: 'This buyer has active orders. Please complete or cancel them first.',
          activeOrders
        });
      }

      // Delete profile picture from Cloudinary
      if (buyer.profilePicture && buyer.profilePicture.publicId) {
        try {
          await deleteFromCloudinary(buyer.profilePicture.publicId);
        } catch (deleteError) {
          logger.warn('Failed to delete profile picture during account deletion', deleteError);
        }
      }

      // Store buyer data for audit before deletion
      const buyerData = {
        id: buyer._id,
        name: `${buyer.firstName} ${buyer.lastName}`,
        email: buyer.email,
        phone: buyer.phone,
        registrationDate: buyer.registrationDate
      };

      await User.findByIdAndDelete(id);

      // Log account deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_BUYER_ACCOUNT',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Buyer',
        resourceId: id,
        details: {
          deletedBuyer: buyerData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: 'Buyer account deleted successfully',
        deletedBuyer: buyerData
      });

    } catch (error) {
      logger.error('Delete buyer account error', error);
      res.status(500).json({
        error: 'Failed to delete account',
        message: 'An error occurred while deleting the buyer account'
      });
    }
  }
);

module.exports = router;