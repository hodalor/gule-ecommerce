const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireRole, authorizeUserType, checkOwnership } = require('../middleware/auth');
const { 
  validateProduct, 
  validateProductUpdate, 
  validatePagination,
  validateSearch,
  handleValidationErrors 
} = require('../middleware/validation');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting for product operations
const productRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many product requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createProductRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each seller to 10 product creations per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many product creation attempts, please try again later.',
    retryAfter: '1 hour'
  }
});

// Get all products with filtering, sorting, and pagination
router.get('/', productRateLimit, validatePagination, validateSearch, handleValidationErrors, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = '-createdAt',
      category,
      minPrice,
      maxPrice,
      condition,
      location,
      search,
      sellerId,
      status = 'active'
    } = req.query;

    // Build filter object
    const filter = { status };

    if (category) filter.category = new RegExp(category, 'i');
    if (condition) filter.condition = condition;
    if (location) filter.location = new RegExp(location, 'i');
    if (sellerId) filter.seller = sellerId;

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate('seller', 'businessName profilePicture rating location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(filter);

    // Add average rating to each product
    const productsWithRating = await Promise.all(
      products.map(async (product) => {
        const reviews = await Review.find({ product: product._id });
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0;
        
        return {
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        };
      })
    );

    res.json({
      success: true,
      data: {
        products: productsWithRating,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNext: skip + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        },
        filters: {
          category,
          minPrice,
          maxPrice,
          condition,
          location,
          search,
          sort
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching products', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product by ID
router.get('/:id', productRateLimit, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'businessName profilePicture rating location contactInfo')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get product reviews
    const reviews = await Review.find({ product: product._id })
      .populate('buyer', 'firstName lastName profilePicture')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Calculate average rating
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Get related products
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      status: 'active'
    })
    .populate('seller', 'businessName rating')
    .limit(6)
    .lean();

    // Increment view count
    await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: {
        product: {
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        },
        reviews,
        relatedProducts
      }
    });

  } catch (error) {
    logger.error('Error fetching product', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new product (Sellers only)
router.post('/', 
  createProductRateLimit,
  authenticate, 
  authorizeUserType('seller'), 
  validateProduct, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const seller = await Seller.findById(req.user.id);
      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      if (seller.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account must be active to create products'
        });
      }

      // Handle image uploads if present
      let imageUrls = [];
      if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        
        const uploadResults = await uploadMultipleToCloudinary(
          images.map(img => img.data),
          {
            folder: `gule/products/${req.user.id}`,
            transformation: [
              { width: 800, height: 600, crop: 'fill', quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          }
        );

        if (uploadResults.failed.length > 0) {
          logger.warn('Some product images failed to upload', {
            sellerId: req.user.id,
            failed: uploadResults.failed
          });
        }

        imageUrls = uploadResults.successful.map(result => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      }

      const productData = {
        ...req.body,
        seller: req.user.id,
        images: imageUrls,
        status: 'pending' // Products need approval
      };

      const product = new Product(productData);
      await product.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'seller',
        action: 'CREATE_PRODUCT',
        resource: 'Product',
        resourceId: product._id,
        details: {
          productName: product.name,
          category: product.category,
          price: product.price,
          imageCount: imageUrls.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Product created successfully', {
        productId: product._id,
        sellerId: req.user.id,
        productName: product.name
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully and is pending approval',
        data: { product }
      });

    } catch (error) {
      logger.error('Error creating product', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update product (Seller owner only)
router.put('/:id', 
  productRateLimit,
  authenticate, 
  authorizeUserType('seller'),
  checkOwnership(Product, 'seller'),
  validateProductUpdate, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Handle new image uploads
      let newImageUrls = [];
      if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        
        const uploadResults = await uploadMultipleToCloudinary(
          images.map(img => img.data),
          {
            folder: `gule/products/${req.user.id}`,
            transformation: [
              { width: 800, height: 600, crop: 'fill', quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          }
        );

        newImageUrls = uploadResults.successful.map(result => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      }

      // Handle image removal
      if (req.body.removeImages && req.body.removeImages.length > 0) {
        const imagesToRemove = Array.isArray(req.body.removeImages) 
          ? req.body.removeImages 
          : [req.body.removeImages];

        // Delete from Cloudinary
        for (const publicId of imagesToRemove) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (error) {
            logger.warn('Failed to delete image from Cloudinary', {
              publicId,
              error: error.message
            });
          }
        }

        // Remove from product images
        product.images = product.images.filter(
          img => !imagesToRemove.includes(img.publicId)
        );
      }

      // Add new images
      if (newImageUrls.length > 0) {
        product.images = [...product.images, ...newImageUrls];
      }

      // Update other fields
      const allowedUpdates = [
        'name', 'description', 'price', 'category', 'condition', 
        'quantity', 'tags', 'specifications', 'location'
      ];

      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          product[field] = req.body[field];
        }
      });

      // Set status to pending if significant changes were made
      const significantFields = ['name', 'description', 'price', 'category'];
      const hasSignificantChanges = significantFields.some(field => req.body[field] !== undefined);
      
      if (hasSignificantChanges || newImageUrls.length > 0) {
        product.status = 'pending';
      }

      product.updatedAt = new Date();
      await product.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'seller',
        action: 'UPDATE_PRODUCT',
        resource: 'Product',
        resourceId: product._id,
        details: {
          updatedFields: Object.keys(req.body),
          newImagesCount: newImageUrls.length,
          removedImagesCount: req.body.removeImages ? req.body.removeImages.length : 0,
          statusChanged: hasSignificantChanges || newImageUrls.length > 0
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Product updated successfully', {
        productId: product._id,
        sellerId: req.user.id,
        updatedFields: Object.keys(req.body)
      });

      res.json({
        success: true,
        message: hasSignificantChanges || newImageUrls.length > 0 
          ? 'Product updated successfully and is pending approval'
          : 'Product updated successfully',
        data: { product }
      });

    } catch (error) {
      logger.error('Error updating product', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete product (Seller owner only)
router.delete('/:id', 
  productRateLimit,
  authenticate, 
  authorizeUserType('seller'),
  checkOwnership(Product, 'seller'),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Delete images from Cloudinary
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          try {
            await deleteFromCloudinary(image.publicId);
          } catch (error) {
            logger.warn('Failed to delete product image from Cloudinary', {
              publicId: image.publicId,
              error: error.message
            });
          }
        }
      }

      // Delete the product
      await Product.findByIdAndDelete(req.params.id);

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'seller',
        action: 'DELETE_PRODUCT',
        resource: 'Product',
        resourceId: product._id,
        details: {
          productName: product.name,
          category: product.category,
          price: product.price,
          deletedImagesCount: product.images.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Product deleted successfully', {
        productId: product._id,
        sellerId: req.user.id,
        productName: product.name
      });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting product', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get seller's products
router.get('/seller/:sellerId', productRateLimit, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = '-createdAt', status } = req.query;
    const { sellerId } = req.params;

    const filter = { seller: sellerId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(filter);

    // Add average rating to each product
    const productsWithRating = await Promise.all(
      products.map(async (product) => {
        const reviews = await Review.find({ product: product._id });
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0;
        
        return {
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        };
      })
    );

    res.json({
      success: true,
      data: {
        products: productsWithRating,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNext: skip + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching seller products', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get product categories
router.get('/categories/list', productRateLimit, async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: 'active' });
    
    // Get category counts
    const categoryCounts = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoriesWithCounts = categoryCounts.map(cat => ({
      name: cat._id,
      count: cat.count
    }));

    res.json({
      success: true,
      data: {
        categories: categoriesWithCounts,
        totalCategories: categories.length
      }
    });

  } catch (error) {
    logger.error('Error fetching product categories', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search products with advanced filters
router.post('/search', productRateLimit, validateSearch, handleValidationErrors, async (req, res) => {
  try {
    const {
      query,
      filters = {},
      sort = '-createdAt',
      page = 1,
      limit = 12
    } = req.body;

    // Build search filter
    const searchFilter = { status: 'active' };

    // Text search
    if (query) {
      searchFilter.$or = [
        { name: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }

    // Apply additional filters
    if (filters.category) searchFilter.category = new RegExp(filters.category, 'i');
    if (filters.condition) searchFilter.condition = filters.condition;
    if (filters.location) searchFilter.location = new RegExp(filters.location, 'i');
    if (filters.minPrice || filters.maxPrice) {
      searchFilter.price = {};
      if (filters.minPrice) searchFilter.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) searchFilter.price.$lte = parseFloat(filters.maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(searchFilter)
      .populate('seller', 'businessName profilePicture rating location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(searchFilter);

    // Add average rating to each product
    const productsWithRating = await Promise.all(
      products.map(async (product) => {
        const reviews = await Review.find({ product: product._id });
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
          : 0;
        
        return {
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        };
      })
    );

    res.json({
      success: true,
      data: {
        products: productsWithRating,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNext: skip + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        },
        searchQuery: query,
        appliedFilters: filters
      }
    });

  } catch (error) {
    logger.error('Error searching products', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;