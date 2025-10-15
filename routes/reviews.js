const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType, checkOwnership } = require('../middleware/auth');
const { 
  validateReview, 
  validateReviewUpdate,
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Rate limiting for review operations
const reviewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many review requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const createReviewRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 review creations per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many review creation attempts, please try again later.',
    retryAfter: '1 hour'
  }
});

// Get reviews for a product
router.get('/product/:productId', reviewRateLimit, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt', rating } = req.query;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build filter
    const filter = { product: productId };
    if (rating) filter.rating = parseInt(rating);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(filter)
      .populate('buyer', 'firstName lastName profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(filter);

    // Calculate rating statistics
    const ratingStats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    let stats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (ratingStats.length > 0) {
      const stat = ratingStats[0];
      stats.averageRating = Math.round(stat.averageRating * 10) / 10;
      stats.totalReviews = stat.totalReviews;
      
      // Count rating distribution
      stat.ratingDistribution.forEach(rating => {
        stats.ratingDistribution[rating]++;
      });
    }

    res.json({
      success: true,
      data: {
        reviews,
        statistics: stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalReviews: total,
          hasNext: skip + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching product reviews', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's reviews
router.get('/my-reviews', 
  reviewRateLimit,
  authenticate, 
  authorizeUserType('buyer'),
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const reviews = await Review.find({ buyer: req.user.id })
        .populate('product', 'name images price')
        .populate('product.seller', 'businessName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Review.countDocuments({ buyer: req.user.id });

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalReviews: total,
            hasNext: skip + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching user reviews', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Create new review (Buyers only, must have purchased the product)
router.post('/', 
  createReviewRateLimit,
  authenticate, 
  authorizeUserType('buyer'), 
  validateReview, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { productId, rating, comment, orderId } = req.body;

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Verify user has purchased this product
      const order = await Order.findOne({
        _id: orderId,
        buyer: req.user.id,
        'items.product': productId,
        status: { $in: ['delivered', 'completed'] }
      });

      if (!order) {
        return res.status(403).json({
          success: false,
          message: 'You can only review products you have purchased and received'
        });
      }

      // Check if user has already reviewed this product
      const existingReview = await Review.findOne({
        buyer: req.user.id,
        product: productId
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this product'
        });
      }

      // Create review
      const review = new Review({
        buyer: req.user.id,
        product: productId,
        order: orderId,
        rating,
        comment
      });

      await review.save();

      // Update product rating statistics
      const productReviews = await Review.find({ product: productId });
      const averageRating = productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;
      
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(averageRating * 10) / 10,
        reviewCount: productReviews.length
      });

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'buyer',
        action: 'CREATE_REVIEW',
        resource: 'Review',
        resourceId: review._id,
        details: {
          productId,
          orderId,
          rating,
          hasComment: !!comment
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Review created successfully', {
        reviewId: review._id,
        buyerId: req.user.id,
        productId,
        rating
      });

      // Populate review for response
      const populatedReview = await Review.findById(review._id)
        .populate('buyer', 'firstName lastName profilePicture')
        .populate('product', 'name images');

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: { review: populatedReview }
      });

    } catch (error) {
      logger.error('Error creating review', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update review (Review owner only)
router.put('/:id', 
  reviewRateLimit,
  authenticate, 
  authorizeUserType('buyer'),
  checkOwnership(Review, 'buyer'),
  validateReviewUpdate, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { rating, comment } = req.body;
      
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Update review
      if (rating !== undefined) review.rating = rating;
      if (comment !== undefined) review.comment = comment;
      review.updatedAt = new Date();

      await review.save();

      // Update product rating statistics
      const productReviews = await Review.find({ product: review.product });
      const averageRating = productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;
      
      await Product.findByIdAndUpdate(review.product, {
        rating: Math.round(averageRating * 10) / 10,
        reviewCount: productReviews.length
      });

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'buyer',
        action: 'UPDATE_REVIEW',
        resource: 'Review',
        resourceId: review._id,
        details: {
          productId: review.product,
          oldRating: review.rating,
          newRating: rating,
          updatedFields: Object.keys(req.body)
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Review updated successfully', {
        reviewId: review._id,
        buyerId: req.user.id,
        updatedFields: Object.keys(req.body)
      });

      // Populate review for response
      const populatedReview = await Review.findById(review._id)
        .populate('buyer', 'firstName lastName profilePicture')
        .populate('product', 'name images');

      res.json({
        success: true,
        message: 'Review updated successfully',
        data: { review: populatedReview }
      });

    } catch (error) {
      logger.error('Error updating review', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete review (Review owner only)
router.delete('/:id', 
  reviewRateLimit,
  authenticate, 
  authorizeUserType('buyer'),
  checkOwnership(Review, 'buyer'),
  async (req, res) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      const productId = review.product;

      // Delete the review
      await Review.findByIdAndDelete(req.params.id);

      // Update product rating statistics
      const productReviews = await Review.find({ product: productId });
      const averageRating = productReviews.length > 0 
        ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length 
        : 0;
      
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(averageRating * 10) / 10,
        reviewCount: productReviews.length
      });

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'buyer',
        action: 'DELETE_REVIEW',
        resource: 'Review',
        resourceId: review._id,
        details: {
          productId,
          rating: review.rating,
          hadComment: !!review.comment
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Review deleted successfully', {
        reviewId: review._id,
        buyerId: req.user.id,
        productId
      });

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting review', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single review by ID
router.get('/:id', reviewRateLimit, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('buyer', 'firstName lastName profilePicture')
      .populate('product', 'name images price')
      .populate('order', 'orderNumber')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      data: { review }
    });

  } catch (error) {
    logger.error('Error fetching review', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get reviews for seller's products
router.get('/seller/my-products', 
  reviewRateLimit,
  authenticate, 
  authorizeUserType('seller'),
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = '-createdAt', rating } = req.query;

      // Get seller's products
      const sellerProducts = await Product.find({ seller: req.user.id }).select('_id');
      const productIds = sellerProducts.map(p => p._id);

      // Build filter
      const filter = { product: { $in: productIds } };
      if (rating) filter.rating = parseInt(rating);

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const reviews = await Review.find(filter)
        .populate('buyer', 'firstName lastName profilePicture')
        .populate('product', 'name images price')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Review.countDocuments(filter);

      // Calculate overall statistics for seller's products
      const stats = await Review.aggregate([
        { $match: { product: { $in: productIds } } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: '$rating'
            }
          }
        }
      ]);

      let statistics = {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      if (stats.length > 0) {
        const stat = stats[0];
        statistics.averageRating = Math.round(stat.averageRating * 10) / 10;
        statistics.totalReviews = stat.totalReviews;
        
        // Count rating distribution
        stat.ratingDistribution.forEach(rating => {
          statistics.ratingDistribution[rating]++;
        });
      }

      res.json({
        success: true,
        data: {
          reviews,
          statistics,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalReviews: total,
            hasNext: skip + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching seller product reviews', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Report review (Any authenticated user)
router.post('/:id/report', 
  reviewRateLimit,
  authenticate,
  async (req, res) => {
    try {
      const { reason, description } = req.body;
      const review = await Review.findById(req.params.id);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Check if user has already reported this review
      const existingReport = review.reports.find(
        report => report.reportedBy.toString() === req.user.id
      );

      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'You have already reported this review'
        });
      }

      // Add report to review
      review.reports.push({
        reportedBy: req.user.id,
        reason,
        description,
        reportedAt: new Date()
      });

      await review.save();

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: req.user.userType,
        action: 'REPORT_REVIEW',
        resource: 'Review',
        resourceId: review._id,
        details: {
          reason,
          description,
          reviewOwner: review.buyer
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Review reported', {
        reviewId: review._id,
        reportedBy: req.user.id,
        reason
      });

      res.json({
        success: true,
        message: 'Review reported successfully. Our team will review this report.'
      });

    } catch (error) {
      logger.error('Error reporting review', error);
      res.status(500).json({
        success: false,
        message: 'Failed to report review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get review statistics
router.get('/stats/summary', reviewRateLimit, authenticate, async (req, res) => {
  try {
    let matchFilter = {};

    // Filter based on user type
    if (req.user.userType === 'buyer') {
      matchFilter.buyer = req.user.id;
    } else if (req.user.userType === 'seller') {
      // Get seller's products first
      const sellerProducts = await Product.find({ seller: req.user.id }).select('_id');
      const productIds = sellerProducts.map(p => p._id);
      matchFilter.product = { $in: productIds };
    }
    // Admin can see all reviews (no filter)

    const stats = await Review.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    let result = {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (stats.length > 0) {
      const stat = stats[0];
      result.totalReviews = stat.totalReviews;
      result.averageRating = Math.round(stat.averageRating * 10) / 10;
      
      // Count rating distribution
      stat.ratingDistribution.forEach(rating => {
        result.ratingDistribution[rating]++;
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error fetching review statistics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;