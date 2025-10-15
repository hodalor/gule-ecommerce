const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query } = require('express-validator');
const multer = require('multer');
const path = require('path');

// Import models
const { Seller, AdminSettings, AuditLog, Product, Order, Review } = require('../models');

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
    fileSize: 10 * 1024 * 1024 // 10MB for business documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf' || 
                     file.mimetype === 'application/msword' || 
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files and documents (PDF, DOC, DOCX) are allowed'));
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

// Helper function to filter seller data based on privacy settings
const filterSellerData = (seller, privacySettings, isOwnProfile = false, isAdmin = false) => {
  const sellerData = seller.toObject();
  
  // Always remove sensitive fields
  delete sellerData.password;
  delete sellerData.emailVerificationToken;
  delete sellerData.emailVerificationExpires;
  delete sellerData.passwordResetToken;
  delete sellerData.passwordResetExpires;
  
  // If it's the seller's own profile or admin, return more data
  if (isOwnProfile || isAdmin) {
    return sellerData;
  }
  
  // Apply privacy filters based on admin settings
  if (privacySettings.hideSellerEmail === 'true') {
    delete sellerData.email;
  }
  
  if (privacySettings.hideSellerPhone === 'true') {
    delete sellerData.phone;
  }
  
  if (privacySettings.hideSellerAddress === 'true') {
    delete sellerData.address;
  }
  
  if (privacySettings.hideSellerBusinessDetails === 'true') {
    delete sellerData.businessDetails;
  }
  
  if (privacySettings.hideSellerLastLogin === 'true') {
    delete sellerData.lastLoginDate;
  }
  
  if (privacySettings.hideSellerRegistrationDate === 'true') {
    delete sellerData.registrationDate;
  }
  
  // Always hide sensitive business information from public
  delete sellerData.accountStatus;
  delete sellerData.loginAttempts;
  delete sellerData.lockUntil;
  delete sellerData.bankDetails;
  delete sellerData.taxInformation;
  delete sellerData.businessDocuments;
  delete sellerData.commissionRate;
  
  return sellerData;
};

// Get all sellers
router.get('/',
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('status').optional().isIn(['active', 'suspended', 'deactivated']).withMessage('Invalid status'),
  query('verified').optional().isBoolean().withMessage('Verified must be a boolean'),
  query('businessVerified').optional().isBoolean().withMessage('Business verified must be a boolean'),
  query('category').optional().isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search;
      const status = req.query.status;
      const verified = req.query.verified;
      const businessVerified = req.query.businessVerified;
      const category = req.query.category;

      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { 'businessDetails.businessName': { $regex: search, $options: 'i' } },
          { 'businessDetails.businessType': { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) {
        query.accountStatus = status;
      }
      
      if (verified !== undefined) {
        query.isEmailVerified = verified === 'true';
      }
      
      if (businessVerified !== undefined) {
        query.isBusinessVerified = businessVerified === 'true';
      }
      
      if (category) {
        query['businessDetails.businessCategory'] = { $regex: category, $options: 'i' };
      }

      // Get privacy settings
      const privacySettings = await getPrivacySettings();
      const isAdmin = req.user.userType === 'admin';

      // Fetch sellers
      const sellers = await Seller.find(query)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires')
        .sort({ registrationDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Seller.countDocuments(query);

      // Apply privacy filtering
      const filteredSellers = sellers.map(seller => 
        filterSellerData(seller, privacySettings, false, isAdmin)
      );

      // Log access
      await AuditLog.logAction({
        action: isAdmin ? 'ADMIN_VIEW_SELLERS' : 'USER_VIEW_SELLERS',
        userId: req.user.id,
        userType: req.user.userType,
        resourceType: 'Seller',
        details: { 
          query: req.query,
          resultCount: sellers.length,
          totalCount: total
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        sellers: filteredSellers,
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
      logger.error('Get sellers error', error);
      res.status(500).json({
        error: 'Failed to fetch sellers',
        message: 'An error occurred while fetching seller data'
      });
    }
  }
);

// Get seller by ID
router.get('/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      const seller = await Seller.findById(id)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      // Check if user can view this profile
      const isOwnProfile = requestingUser.userType === 'seller' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        // Get privacy settings for public view
        const privacySettings = await getPrivacySettings();
        
        // Check if public seller profiles are allowed
        if (privacySettings.allowPublicSellerProfiles !== 'true') {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to view this seller profile'
          });
        }
      }

      // Get privacy settings and filter data
      const privacySettings = await getPrivacySettings();
      const filteredSeller = filterSellerData(seller, privacySettings, isOwnProfile, isAdmin);

      // Log profile access
      await AuditLog.logAction({
        action: isOwnProfile ? 'SELLER_VIEW_OWN_PROFILE' : 'USER_VIEW_SELLER_PROFILE',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Seller',
        resourceId: id,
        details: { 
          viewedSellerId: id,
          isOwnProfile,
          isAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        seller: filteredSeller
      });

    } catch (error) {
      logger.error('Get seller by ID error', error);
      res.status(500).json({
        error: 'Failed to fetch seller',
        message: 'An error occurred while fetching seller data'
      });
    }
  }
);

// Update seller profile
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
      const isOwnProfile = requestingUser.userType === 'seller' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to update this profile'
        });
      }

      const seller = await Seller.findById(id);

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      const {
        firstName,
        lastName,
        phone,
        address,
        businessDetails,
        bankDetails,
        taxInformation
      } = req.body;

      // Store original data for audit
      const originalData = {
        firstName: seller.firstName,
        lastName: seller.lastName,
        phone: seller.phone,
        address: seller.address,
        businessDetails: seller.businessDetails,
        bankDetails: seller.bankDetails,
        taxInformation: seller.taxInformation
      };

      // Update fields
      if (firstName !== undefined) seller.firstName = firstName;
      if (lastName !== undefined) seller.lastName = lastName;
      if (phone !== undefined) {
        // Check if phone is already taken by another seller
        const existingSeller = await Seller.findOne({ 
          phone, 
          _id: { $ne: id } 
        });
        
        if (existingSeller) {
          return res.status(409).json({
            error: 'Phone number already exists',
            message: 'This phone number is already associated with another seller account'
          });
        }
        
        seller.phone = phone;
        seller.isPhoneVerified = false; // Reset verification status
      }
      if (address !== undefined) seller.address = address;
      if (businessDetails !== undefined) {
        seller.businessDetails = { ...seller.businessDetails, ...businessDetails };
        // Reset business verification if critical details changed
        if (businessDetails.businessName || businessDetails.businessType || businessDetails.businessRegistrationNumber) {
          seller.isBusinessVerified = false;
          seller.businessVerificationStatus = 'pending';
        }
      }
      if (bankDetails !== undefined) seller.bankDetails = { ...seller.bankDetails, ...bankDetails };
      if (taxInformation !== undefined) seller.taxInformation = { ...seller.taxInformation, ...taxInformation };

      seller.updatedAt = new Date();
      await seller.save();

      // Log profile update
      await AuditLog.logAction({
        action: isOwnProfile ? 'SELLER_UPDATE_OWN_PROFILE' : 'ADMIN_UPDATE_SELLER_PROFILE',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Seller',
        resourceId: id,
        details: {
          updatedSellerId: id,
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
      const filteredSeller = filterSellerData(seller, privacySettings, isOwnProfile, isAdmin);

      res.json({
        message: 'Profile updated successfully',
        seller: filteredSeller
      });

    } catch (error) {
      logger.error('Update seller profile error', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: 'An error occurred while updating the profile'
      });
    }
  }
);

// Upload business documents
router.post('/:id/business-documents',
  authenticate,
  upload.array('documents', 5), // Allow up to 5 documents
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can update this profile
      const isOwnProfile = requestingUser.userType === 'seller' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to upload business documents'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select business documents to upload'
        });
      }

      const seller = await Seller.findById(id);

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      const uploadedDocuments = [];

      // Upload each document
      for (const file of req.files) {
        try {
          const uploadResult = await uploadToCloudinary(file.buffer, {
            folder: 'gule/business-documents',
            public_id: `seller_${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            resource_type: 'auto' // Auto-detect file type
          });

          uploadedDocuments.push({
            name: file.originalname,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            uploadedAt: new Date(),
            verified: false
          });
        } catch (uploadError) {
          logger.error('Failed to upload business document', uploadError);
          // Continue with other files
        }
      }

      if (uploadedDocuments.length === 0) {
        return res.status(500).json({
          error: 'Upload failed',
          message: 'Failed to upload any business documents'
        });
      }

      // Add to seller's business documents
      if (!seller.businessDocuments) {
        seller.businessDocuments = [];
      }
      seller.businessDocuments.push(...uploadedDocuments);
      
      // Reset business verification status
      seller.isBusinessVerified = false;
      seller.businessVerificationStatus = 'pending';
      seller.updatedAt = new Date();
      await seller.save();

      // Log document upload
      await AuditLog.logAction({
        action: 'SELLER_UPLOAD_BUSINESS_DOCUMENTS',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Seller',
        resourceId: id,
        details: {
          sellerId: id,
          documentsUploaded: uploadedDocuments.length,
          documentNames: uploadedDocuments.map(doc => doc.name),
          isOwnProfile,
          isAdmin
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: 'Business documents uploaded successfully',
        uploadedDocuments: uploadedDocuments.length,
        documents: uploadedDocuments
      });

    } catch (error) {
      logger.error('Upload business documents error', error);
      res.status(500).json({
        error: 'Failed to upload business documents',
        message: 'An error occurred while uploading the business documents'
      });
    }
  }
);

// Verify business documents (Admin only)
router.patch('/:id/verify-business',
  authenticate,
  authorizeUserType(['admin']),
  body('verified').isBoolean().withMessage('Verified status must be a boolean'),
  body('notes').optional().isLength({ min: 1, max: 1000 }).withMessage('Notes must be between 1 and 1000 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { verified, notes } = req.body;

      const seller = await Seller.findById(id);

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      const oldVerificationStatus = seller.isBusinessVerified;
      seller.isBusinessVerified = verified;
      seller.businessVerificationStatus = verified ? 'verified' : 'rejected';
      seller.businessVerificationDate = verified ? new Date() : null;
      seller.businessVerificationNotes = notes || '';
      seller.updatedAt = new Date();
      await seller.save();

      // Log business verification
      await AuditLog.logAction({
        action: 'ADMIN_VERIFY_SELLER_BUSINESS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: id,
        details: {
          sellerId: id,
          oldStatus: oldVerificationStatus,
          newStatus: verified,
          notes: notes || 'No notes provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: `Business ${verified ? 'verified' : 'rejected'} successfully`,
        seller: {
          id: seller._id,
          businessName: seller.businessDetails?.businessName,
          isBusinessVerified: seller.isBusinessVerified,
          businessVerificationStatus: seller.businessVerificationStatus,
          businessVerificationDate: seller.businessVerificationDate
        }
      });

    } catch (error) {
      logger.error('Verify business error', error);
      res.status(500).json({
        error: 'Failed to verify business',
        message: 'An error occurred while verifying the business'
      });
    }
  }
);

// Get seller statistics
router.get('/:id/statistics',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      // Check if user can view statistics
      const isOwnProfile = requestingUser.userType === 'seller' && requestingUser.id === id;
      const isAdmin = requestingUser.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view these statistics'
        });
      }

      const seller = await Seller.findById(id);

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      // Get product statistics
      const productStats = await Product.aggregate([
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
            },
            averagePrice: { $avg: '$price' },
            totalViews: { $sum: '$views' }
          }
        }
      ]);

      // Get order statistics
      const orderStats = await Order.aggregate([
        { $match: { seller: seller._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
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
        { $match: { seller: seller._id } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            fiveStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
            },
            fourStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
            },
            threeStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
            },
            twoStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
            },
            oneStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
            }
          }
        }
      ]);

      const statistics = {
        seller: {
          id: seller._id,
          name: `${seller.firstName} ${seller.lastName}`,
          businessName: seller.businessDetails?.businessName,
          email: seller.email,
          registrationDate: seller.registrationDate,
          lastLoginDate: seller.lastLoginDate,
          accountStatus: seller.accountStatus,
          isBusinessVerified: seller.isBusinessVerified
        },
        products: productStats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          pendingProducts: 0,
          averagePrice: 0,
          totalViews: 0
        },
        orders: orderStats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          completedOrders: 0,
          cancelledOrders: 0
        },
        reviews: reviewStats[0] || {
          totalReviews: 0,
          averageRating: 0,
          fiveStarReviews: 0,
          fourStarReviews: 0,
          threeStarReviews: 0,
          twoStarReviews: 0,
          oneStarReviews: 0
        }
      };

      // Log statistics access
      await AuditLog.logAction({
        action: isOwnProfile ? 'SELLER_VIEW_OWN_STATISTICS' : 'ADMIN_VIEW_SELLER_STATISTICS',
        userId: requestingUser.id,
        userType: requestingUser.userType,
        resourceType: 'Seller',
        resourceId: id,
        details: { viewedSellerId: id, isOwnProfile, isAdmin },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        statistics
      });

    } catch (error) {
      logger.error('Get seller statistics error', error);
      res.status(500).json({
        error: 'Failed to fetch statistics',
        message: 'An error occurred while fetching seller statistics'
      });
    }
  }
);

// Suspend/Unsuspend seller (Admin only)
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

      const seller = await Seller.findById(id);

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      const oldStatus = seller.accountStatus;
      seller.accountStatus = status;
      seller.updatedAt = new Date();
      await seller.save();

      // If suspending, also suspend all active products
      if (status === 'suspended') {
        await Product.updateMany(
          { seller: id, status: 'active' },
          { status: 'suspended', updatedAt: new Date() }
        );
      }

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_CHANGE_SELLER_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: id,
        details: {
          sellerId: id,
          oldStatus,
          newStatus: status,
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: `Seller account ${status} successfully`,
        seller: {
          id: seller._id,
          name: `${seller.firstName} ${seller.lastName}`,
          businessName: seller.businessDetails?.businessName,
          email: seller.email,
          accountStatus: seller.accountStatus
        }
      });

    } catch (error) {
      logger.error('Change seller status error', error);
      res.status(500).json({
        error: 'Failed to change status',
        message: 'An error occurred while changing the seller status'
      });
    }
  }
);

// Delete seller account (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const seller = await Seller.findById(id);

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      // Check for active orders
      const activeOrders = await Order.countDocuments({
        seller: id,
        status: { $in: ['pending', 'processing', 'shipped'] }
      });

      if (activeOrders > 0) {
        return res.status(400).json({
          error: 'Cannot delete account',
          message: 'This seller has active orders. Please complete or cancel them first.',
          activeOrders
        });
      }

      // Delete business documents from Cloudinary
      if (seller.businessDocuments && seller.businessDocuments.length > 0) {
        for (const doc of seller.businessDocuments) {
          if (doc.publicId) {
            try {
              await deleteFromCloudinary(doc.publicId);
            } catch (deleteError) {
              logger.warn('Failed to delete business document during account deletion', deleteError);
            }
          }
        }
      }

      // Delete profile picture from Cloudinary
      if (seller.profilePicture && seller.profilePicture.publicId) {
        try {
          await deleteFromCloudinary(seller.profilePicture.publicId);
        } catch (deleteError) {
          logger.warn('Failed to delete profile picture during account deletion', deleteError);
        }
      }

      // Store seller data for audit before deletion
      const sellerData = {
        id: seller._id,
        name: `${seller.firstName} ${seller.lastName}`,
        businessName: seller.businessDetails?.businessName,
        email: seller.email,
        phone: seller.phone,
        registrationDate: seller.registrationDate
      };

      // Delete all products by this seller
      await Product.deleteMany({ seller: id });

      await Seller.findByIdAndDelete(id);

      // Log account deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_SELLER_ACCOUNT',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Seller',
        resourceId: id,
        details: {
          deletedSeller: sellerData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        message: 'Seller account deleted successfully',
        deletedSeller: sellerData
      });

    } catch (error) {
      logger.error('Delete seller account error', error);
      res.status(500).json({
        error: 'Failed to delete account',
        message: 'An error occurred while deleting the seller account'
      });
    }
  }
);

module.exports = router;