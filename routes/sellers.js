const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
const { sendPasswordResetEmail } = require('../utils/email');
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
  // Handle both Mongoose documents and plain objects
  const sellerData = seller.toObject ? seller.toObject() : { ...seller };
  
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

const isOwnSellerProfileRequest = (req, sellerId) => {
  const requesterId = req.user?._id?.toString?.() || req.user?.id?.toString?.();
  return req.userType === 'seller' && requesterId === String(sellerId);
};

// Get all sellers (public endpoint)
router.get('/public',
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('category').optional().isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
  query('sortBy').optional().isIn(['rating', 'products', 'reviews', 'newest']).withMessage('Invalid sortBy parameter'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const search = req.query.search;
      const category = req.query.category;
      const sortBy = req.query.sortBy || 'rating';

      // Build query - only show active sellers publicly
      const query = {
        status: 'active',
        isActive: true
      };
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { 'businessDetails.businessName': { $regex: search, $options: 'i' } },
          { 'businessDetails.businessType': { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category) {
        query['businessDetails.businessCategory'] = { $regex: category, $options: 'i' };
      }

      // Get privacy settings
      const privacySettings = await getPrivacySettings();

      // Fetch sellers with limited public information
      const sellers = await Seller.find(query)
        .select('firstName lastName businessDetails profilePicture rating totalSales registrationDate isVerified verificationStatus')
        .skip(skip)
        .limit(limit);

      const total = await Seller.countDocuments(query);

      // Calculate actual product counts and ratings for each seller
      const Product = require('../models/Product');
      const Review = require('../models/Review');
      
      const sellersWithStats = await Promise.all(sellers.map(async (seller) => {
        // Count approved products for this seller
        const productCount = await Product.countDocuments({
          seller: seller._id,
          status: 'approved'
        });

        // Calculate average rating from reviews
        const reviews = await Review.find({ seller: seller._id });
        const averageRating = reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0;

        // Convert to object and add calculated fields
        const sellerObj = seller.toObject();
        sellerObj.totalProducts = productCount;
        sellerObj.rating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
        sellerObj.totalReviews = reviews.length;

        return sellerObj;
      }));

      // Sort sellers based on sortBy parameter
      sellersWithStats.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'products':
            return (b.totalProducts || 0) - (a.totalProducts || 0);
          case 'reviews':
            return (b.totalReviews || 0) - (a.totalReviews || 0);
          case 'newest':
            return new Date(b.registrationDate) - new Date(a.registrationDate);
          default:
            return (b.rating || 0) - (a.rating || 0);
        }
      });

      // Apply privacy filtering for public view
      const filteredSellers = sellersWithStats.map(seller => 
        filterSellerData(seller, privacySettings, false, false)
      );

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
      logger.error('Get public sellers error', error);
      res.status(500).json({
        error: 'Failed to fetch sellers',
        message: 'An error occurred while fetching seller data'
      });
    }
  }
);

// Get all sellers (authenticated endpoint)
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

// Public: Get seller by ID without authentication
router.get('/public/:id',
  async (req, res) => {
    try {
      const { id } = req.params;

      // Ensure public profiles are allowed
      const privacySettings = await getPrivacySettings();
      if (privacySettings.allowPublicSellerProfiles === 'false') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Public seller profiles are disabled by admin settings'
        });
      }

      // Fetch seller with limited fields for public view
      const seller = await Seller.findById(id)
        .select('firstName lastName businessDetails profilePicture rating totalSales registrationDate isVerified verificationStatus createdAt');

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      // Apply privacy filtering
      const filteredSeller = filterSellerData(seller, privacySettings, false, false);

      // Optional: include minimal aggregates for storefront tabs
      let productsCount = 0;
      let reviewsCount = 0;
      let averageRating = 0;
      
      try {
        productsCount = await Product.countDocuments({ seller: id, status: 'approved' });
      } catch (e) {
        logger.warn('Failed to count products for public seller', { sellerId: id, error: e.message });
      }
      
      try {
        const reviews = await Review.find({ seller: id });
        reviewsCount = reviews.length;
        averageRating = reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0;
      } catch (e) {
        logger.warn('Failed to count reviews for public seller', { sellerId: id, error: e.message });
      }

      return res.json({
        seller: {
          ...filteredSeller,
          totalProducts: productsCount,
          totalReviews: reviewsCount,
          rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
        }
      });
    } catch (error) {
      logger.error('Get public seller by ID error', error);
      return res.status(500).json({
        error: 'Failed to fetch seller',
        message: 'An error occurred while fetching seller data'
      });
    }
  }
);

// Get seller profile (owner or admin)
router.get('/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const isOwnProfile = isOwnSellerProfileRequest(req, id);
      const isAdmin = req.userType === 'admin';

      if (!isOwnProfile && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to view this profile'
        });
      }

      const seller = await Seller.findById(id)
        .select('-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');

      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      const privacySettings = await getPrivacySettings();
      const filteredSeller = filterSellerData(seller, privacySettings, isOwnProfile, isAdmin);

      return res.json({
        seller: filteredSeller
      });
    } catch (error) {
      logger.error('Get seller profile error', error);
      return res.status(500).json({
        error: 'Failed to fetch seller profile',
        message: 'An error occurred while fetching the seller profile'
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
      const isOwnProfile = isOwnSellerProfileRequest(req, id);
      const isAdmin = req.userType === 'admin';

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
        businessName,
        businessType,
        businessDescription,
        businessRegistrationNumber,
        taxNumber,
        businessAddress,
        profileImage,
        businessLogo,
        preferences,
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
        businessName: seller.businessName,
        businessType: seller.businessType,
        businessDescription: seller.businessDescription,
        businessRegistrationNumber: seller.businessRegistrationNumber,
        taxNumber: seller.taxNumber,
        businessAddress: seller.businessAddress,
        bankDetails: seller.bankDetails,
        preferences: seller.preferences,
        profileImage: seller.profileImage,
        businessLogo: seller.businessLogo
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

      const normalizedBusinessAddress = businessAddress || address || (
        businessDetails && {
          street: businessDetails.businessAddress,
          city: businessDetails.businessCity,
          state: businessDetails.businessState,
          zipCode: businessDetails.businessZip,
          country: businessDetails.businessCountry
        }
      );

      const hasBusinessIdentityChange = (
        businessName !== undefined ||
        businessType !== undefined ||
        businessRegistrationNumber !== undefined ||
        businessDetails?.businessName !== undefined ||
        businessDetails?.businessType !== undefined ||
        businessDetails?.businessRegistrationNumber !== undefined
      );

      if (businessName !== undefined) seller.businessName = businessName;
      if (businessType !== undefined) seller.businessType = businessType;
      if (businessDescription !== undefined) seller.businessDescription = businessDescription;
      if (businessRegistrationNumber !== undefined) seller.businessRegistrationNumber = businessRegistrationNumber;
      if (taxNumber !== undefined) seller.taxNumber = taxNumber;
      if (profileImage !== undefined) seller.profileImage = profileImage;
      if (businessLogo !== undefined) seller.businessLogo = businessLogo;

      if (businessDetails !== undefined) {
        if (businessDetails.businessName !== undefined) seller.businessName = businessDetails.businessName;
        if (businessDetails.businessType !== undefined) seller.businessType = businessDetails.businessType;
        if (businessDetails.businessDescription !== undefined) seller.businessDescription = businessDetails.businessDescription;
        if (businessDetails.businessRegistrationNumber !== undefined) {
          seller.businessRegistrationNumber = businessDetails.businessRegistrationNumber;
        }
        if (businessDetails.taxNumber !== undefined) seller.taxNumber = businessDetails.taxNumber;
      }

      if (normalizedBusinessAddress !== undefined) {
        seller.businessAddress = {
          ...seller.businessAddress,
          ...normalizedBusinessAddress
        };
      }

      if (bankDetails !== undefined) seller.bankDetails = { ...seller.bankDetails, ...bankDetails };
      if (taxInformation !== undefined && taxInformation.taxNumber !== undefined) {
        seller.taxNumber = taxInformation.taxNumber;
      }
      if (preferences !== undefined) {
        seller.preferences = {
          ...seller.preferences,
          ...preferences
        };
      }

      if (hasBusinessIdentityChange) {
        seller.verificationStatus = 'pending';
        seller.isVerified = false;
        seller.verifiedAt = null;
        seller.verifiedBy = null;
      }

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
      const isOwnProfile = isOwnSellerProfileRequest(req, id);
      const isAdmin = req.userType === 'admin';

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
      // Check if user can view statistics
      const isOwnProfile = isOwnSellerProfileRequest(req, id);
      const isAdmin = req.userType === 'admin';

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

// Seller Password Reset Request
router.post('/forgot-password',
  body('email').isEmail().withMessage('Valid email is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;

      const seller = await Seller.findOne({ email });

      // Always return success to prevent email enumeration
      const successResponse = {
        message: 'Password reset instructions sent',
        note: 'If a seller account with this email exists, you will receive password reset instructions.'
      };

      if (!seller) {
        await AuditLog.logAction({
          action: 'SELLER_PASSWORD_RESET_ATTEMPT_INVALID_EMAIL',
          userId: null,
          userType: 'seller',
          resourceType: 'Authentication',
          details: { email, reason: 'seller_not_found' },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'low'
        });

        return res.json(successResponse);
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      seller.passwordResetToken = resetToken;
      seller.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await seller.save();

      // Send reset email
      try {
        await sendPasswordResetEmail(
          email,
          `${seller.firstName} ${seller.lastName}`,
          resetToken,
          'seller'
        );

        await AuditLog.logAction({
          action: 'SELLER_PASSWORD_RESET_REQUESTED',
          userId: seller._id,
          userType: 'seller',
          resourceType: 'Authentication',
          resourceId: seller._id,
          details: { email },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });

      } catch (emailError) {
        logger.error('Failed to send seller password reset email', emailError);
      }

      res.json(successResponse);

    } catch (error) {
      logger.error('Seller password reset request error', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while processing your request'
      });
    }
  }
);

// Seller Password Reset
router.post('/reset-password',
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      const seller = await Seller.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      }).select('+password');

      if (!seller) {
        return res.status(400).json({
          error: 'Invalid or expired token',
          message: 'Password reset token is invalid or has expired'
        });
      }

      // Set new password (will be hashed by model middleware)
      seller.password = password;
      seller.passwordResetToken = undefined;
      seller.passwordResetExpires = undefined;

      await seller.save();

      // Log password reset
      await AuditLog.logAction({
        action: 'SELLER_PASSWORD_RESET_COMPLETED',
        performedBy: seller._id,
        userType: 'seller',
        userModel: 'Seller',
        targetResource: 'Authentication',
        targetId: seller._id,
        details: { email: seller.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        message: 'Password reset successful',
        note: 'You can now login with your new password'
      });

    } catch (error) {
      logger.error('Seller password reset error', error);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while resetting your password'
      });
    }
  }
);

// Admin: Manually reset seller password
router.post('/:id/reset-password',
  authenticate,
  authorizeUserType(['admin']),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      const seller = await Seller.findById(id).select('+password');
      if (!seller) {
        return res.status(404).json({
          error: 'Seller not found',
          message: 'The requested seller does not exist'
        });
      }

      // Update password; model pre-save hooks will hash it
      seller.password = password;
      seller.passwordResetToken = undefined;
      seller.passwordResetExpires = undefined;

      await seller.save();

      // Audit log
      await AuditLog.logAction({
        action: 'ADMIN_MANUAL_SELLER_PASSWORD_RESET',
        performedBy: req.user.id,
        userType: 'admin',
        userModel: 'Admin',
        targetResource: 'Seller',
        targetId: seller._id,
        details: { 
          targetSellerId: seller._id, 
          targetSellerEmail: seller.email,
          targetSellerName: `${seller.firstName} ${seller.lastName}`
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high',
        status: 'success'
      });

      res.json({ 
        message: 'Seller password reset successfully',
        seller: {
          id: seller._id,
          name: `${seller.firstName} ${seller.lastName}`,
          email: seller.email,
          businessName: seller.businessName
        }
      });

    } catch (error) {
      logger.error('Admin manual seller password reset error', error);
      res.status(500).json({
        error: 'Failed to reset password',
        message: 'An error occurred while resetting the seller password'
      });
    }
  }
);

module.exports = router;
