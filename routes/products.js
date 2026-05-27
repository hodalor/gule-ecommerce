const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const Category = require('../models/Category');
const AdminSettings = require('../models/AdminSettings');
const { authenticate, authorize, authorizeUserType, checkOwnership } = require('../middleware/auth');
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
const mongoose = require('mongoose');

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

const toNumberOr = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPriceRange = (product) => {
  const variantPrices = (Array.isArray(product?.variants) ? product.variants : [])
    .map((variant) => Number(variant?.price))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!variantPrices.length) {
    const basePrice = toNumberOr(product?.price, 0);
    return {
      min: basePrice,
      max: basePrice
    };
  }

  return {
    min: Math.min(...variantPrices),
    max: Math.max(...variantPrices)
  };
};

const decorateProductForResponse = (product) => {
  if (!product) {
    return product;
  }

  const priceRange = buildPriceRange(product);
  const totalVariantStock = (Array.isArray(product?.variants) ? product.variants : []).reduce((sum, variant) => {
    const stock = Number(variant?.stock);
    return sum + (Number.isFinite(stock) && stock > 0 ? stock : 0);
  }, 0);

  return {
    ...product,
    priceRange,
    displayPrice: priceRange.min,
    availableStock: product?.productType === 'variable' ? totalVariantStock : toNumberOr(product?.stock, 0),
    variantCount: Array.isArray(product?.variants) ? product.variants.length : 0
  };
};

const normalizeAttributes = (attributes = []) => {
  if (!Array.isArray(attributes)) {
    return [];
  }

  return attributes
    .map((attribute) => {
      const name = String(attribute?.name || attribute?.label || '').trim();
      const values = Array.isArray(attribute?.values)
        ? attribute.values
        : (attribute?.value ? [attribute.value] : []);

      return {
        name,
        values: values
          .map((value) => String(value || '').trim())
          .filter(Boolean),
        variation: attribute?.variation === true,
        visible: attribute?.visible !== false
      };
    })
    .filter((attribute) => attribute.name && attribute.values.length > 0);
};

const normalizeSpecifications = (specifications = []) => {
  if (!Array.isArray(specifications)) {
    return [];
  }

  return specifications
    .map((specification) => ({
      name: String(specification?.name || specification?.key || '').trim(),
      value: String(specification?.value || '').trim()
    }))
    .filter((specification) => specification.name && specification.value);
};

const normalizeVariants = (variants = []) => {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .flatMap((variant, variantIndex) => {
      if (Array.isArray(variant?.options)) {
        return variant.options.map((option, optionIndex) => ({
          optionId: String(option?.optionId || option?.id || `${Date.now()}_${variantIndex}_${optionIndex}`).trim(),
          name: String(variant?.name || '').trim(),
          value: String(option?.value || '').trim(),
          price: toNumberOr(option?.price, 0),
          stock: Math.max(0, toNumberOr(option?.stock, 0)),
          sku: String(option?.sku || '').trim().toUpperCase(),
          image: option?.image && option.image.url ? option.image : null,
          imageUploadField: option?.imageUploadField || `variant_image_${variantIndex}_${optionIndex}`
        }));
      }

      return [{
        optionId: String(variant?.optionId || variant?.id || `${Date.now()}_${variantIndex}`).trim(),
        name: String(variant?.name || '').trim(),
        value: String(variant?.value || '').trim(),
        price: toNumberOr(variant?.price, 0),
        stock: Math.max(0, toNumberOr(variant?.stock, 0)),
        sku: String(variant?.sku || '').trim().toUpperCase(),
        image: variant?.image && variant.image.url ? variant.image : null,
        imageUploadField: variant?.imageUploadField || `variant_image_${variantIndex}`
      }];
    })
    .filter((variant) => variant.name && variant.value)
    .map((variant) => ({
      optionId: variant.optionId,
      name: variant.name,
      value: variant.value,
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku,
      image: variant.image || undefined,
      imageUploadField: variant.imageUploadField
    }));
};

const enrichVariantImages = async (variants, files, sellerId) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const normalizedFiles = files && typeof files === 'object' ? files : {};

  return Promise.all(variants.map(async (variant, index) => {
    const uploadField = variant.imageUploadField;
    const uploadFile = uploadField ? normalizedFiles[uploadField] : null;

    if (!uploadFile) {
      return {
        optionId: variant.optionId,
        name: variant.name,
        value: variant.value,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
        image: variant.image || undefined
      };
    }

    const uploadResult = await uploadToCloudinary(uploadFile.tempFilePath || uploadFile.data, {
      folder: `gule/products/${sellerId}/variants`,
      public_id: `${variant.optionId || `variant_${index}`}_${Date.now()}`
    });

    return {
      optionId: variant.optionId,
      name: variant.name,
      value: variant.value,
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku,
      image: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        alt: `${variant.name} - ${variant.value}`
      }
    };
  }));
};

// Get product categories
router.get('/categories', productRateLimit, async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: 'active' });
    
    // Get category counts
    const categoryCounts = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoriesWithCounts = await Promise.all(
      categoryCounts.map(async (cat) => {
        let displayName = cat._id;
        try {
          const idStr = typeof cat._id === 'string' ? cat._id : (cat._id?._id || cat._id?.toString?.());
          if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
            const categoryDoc = await Category.findById(idStr).lean();
            if (categoryDoc?.name) {
              displayName = categoryDoc.name;
            }
          }
        } catch (e) {
          // Fallback to raw id as name on error
        }
        return { name: displayName, count: cat.count };
      })
    );

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

// Get featured products (active + featured)
router.get('/featured', productRateLimit, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '8');

    // Retrieve featured products
    const featured = await Product.findFeatured(limit)
      .populate('seller', 'businessName profilePicture rating location')
      .lean();

    // Attach rating info similar to general list
    const productsWithRating = await Promise.all(
      featured.map(async (product) => {
        const reviews = await Review.find({ product: product._id });
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        return decorateProductForResponse({
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        });
      })
    );

    return res.json({
      success: true,
      data: {
        products: productsWithRating,
        total: productsWithRating.length,
      }
    });
  } catch (error) {
    logger.error('Error fetching featured products', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    if (category) {
      try {
        const categoryDoc = await Category.findOne({ name: new RegExp(`^${category}$`, 'i') }).lean();
        if (categoryDoc) {
          filter.$or = [
            { category: categoryDoc._id },
            { category: new RegExp(category, 'i') }
          ];
        } else {
          filter.category = new RegExp(category, 'i');
        }
      } catch (e) {
        filter.category = new RegExp(category, 'i');
      }
    }
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
        
        return decorateProductForResponse({
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        });
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
        product: decorateProductForResponse({
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        }),
        reviews,
        relatedProducts: relatedProducts.map(decorateProductForResponse)
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
        
        // Support both express-fileupload temp files and raw buffers
        const sources = images.map(img => img.tempFilePath || img.data);
        const uploadResults = await uploadMultipleToCloudinary(
          sources,
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

      // Prepare body using safe parsing; validators already sanitize JSON-like fields
      const parsedBody = { ...req.body };

      const safeParse = (value, fallback) => {
        if (typeof value !== 'string') return value;
        try {
          const t = value.trim();
          if (t.startsWith('{') || t.startsWith('[')) {
            return JSON.parse(t);
          }
        } catch (e) {
          // swallow parse error; keep fallback
        }
        return fallback;
      };

      parsedBody.dimensions = safeParse(parsedBody.dimensions, parsedBody.dimensions);
      parsedBody.weight = safeParse(parsedBody.weight, parsedBody.weight);
      parsedBody.variants = safeParse(parsedBody.variants, parsedBody.variants);
      parsedBody.attributes = safeParse(parsedBody.attributes, parsedBody.attributes);
      parsedBody.specifications = safeParse(parsedBody.specifications, parsedBody.specifications);
      parsedBody.tags = safeParse(parsedBody.tags, Array.isArray(parsedBody.tags) ? parsedBody.tags : []);
      parsedBody.attributes = normalizeAttributes(parsedBody.attributes);
      parsedBody.specifications = normalizeSpecifications(parsedBody.specifications);
      parsedBody.variants = await enrichVariantImages(
        normalizeVariants(parsedBody.variants),
        req.files,
        req.user.id
      );

      // Normalize lowStockThreshold from minStock if provided
      if (parsedBody.minStock !== undefined && parsedBody.lowStockThreshold === undefined) {
        const minStockNum = Number(parsedBody.minStock);
        if (!Number.isNaN(minStockNum)) {
          parsedBody.lowStockThreshold = minStockNum;
        }
        delete parsedBody.minStock;
      }

      // Normalize category: accept name or ObjectId string
      if (parsedBody.category) {
        const catInput = parsedBody.category;
        if (typeof catInput === 'string' && !mongoose.Types.ObjectId.isValid(catInput)) {
          try {
            const existingCategory = await Category.findOne({ name: new RegExp(`^${catInput}$`, 'i') }).lean();
            if (existingCategory) {
              parsedBody.category = existingCategory._id;
            } else {
              const createdCategory = await Category.create({ name: catInput, status: 'active' });
              parsedBody.category = createdCategory._id;
            }
          } catch (e) {
            logger.warn('Category normalization failed', { category: catInput, error: e.message });
          }
        }
      }

      // Map SEO fields to the correct structure
      const seoInfo = {};
      if (parsedBody.seoTitle) seoInfo.metaTitle = parsedBody.seoTitle;
      if (parsedBody.seoDescription) seoInfo.metaDescription = parsedBody.seoDescription;
      if (parsedBody.seoKeywords) {
        seoInfo.keywords = Array.isArray(parsedBody.seoKeywords) 
          ? parsedBody.seoKeywords 
          : parsedBody.seoKeywords.split(',').map(k => k.trim());
      }

      const productData = {
        ...parsedBody,
        seller: req.user.id,
        images: imageUrls,
        status: 'pending',
        seoInfo: Object.keys(seoInfo).length > 0 ? seoInfo : undefined
      };

      // Determine auto-approve behavior from admin settings
      try {
        const settingDoc = await AdminSettings.findOne().select('features.autoApproveProducts').lean();
        const autoApproveEnabled = settingDoc?.features?.autoApproveProducts === true;
        if (autoApproveEnabled) {
          productData.status = 'active';
        }
      } catch (e) {
        logger.warn('Auto-approve check failed; defaulting to pending', { error: e.message });
      }

      // Remove the original SEO fields as they're now in seoInfo
      delete productData.seoTitle;
      delete productData.seoDescription;
      delete productData.seoKeywords;

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
        
        const sources = images.map(img => img.tempFilePath || img.data);
        const uploadResults = await uploadMultipleToCloudinary(
          sources,
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

      // Prepare body using safe parsing; validators already sanitize JSON-like fields
      const parsedBody = { ...req.body };

      const safeParse = (value, fallback) => {
        if (typeof value !== 'string') return value;
        try {
          const t = value.trim();
          if (t.startsWith('{') || t.startsWith('[')) {
            return JSON.parse(t);
          }
        } catch (e) {
          // swallow parse error; keep fallback
        }
        return fallback;
      };

      parsedBody.dimensions = safeParse(parsedBody.dimensions, parsedBody.dimensions);
      parsedBody.weight = safeParse(parsedBody.weight, parsedBody.weight);
      parsedBody.variants = safeParse(parsedBody.variants, parsedBody.variants);
      parsedBody.attributes = safeParse(parsedBody.attributes, parsedBody.attributes);
      parsedBody.specifications = safeParse(parsedBody.specifications, parsedBody.specifications);
      parsedBody.tags = safeParse(parsedBody.tags, Array.isArray(parsedBody.tags) ? parsedBody.tags : []);
      parsedBody.attributes = normalizeAttributes(parsedBody.attributes);
      parsedBody.specifications = normalizeSpecifications(parsedBody.specifications);
      parsedBody.variants = await enrichVariantImages(
        normalizeVariants(parsedBody.variants),
        req.files,
        req.user.id
      );

      // Normalize lowStockThreshold from minStock if provided
      if (parsedBody.minStock !== undefined && parsedBody.lowStockThreshold === undefined) {
        const minStockNum = Number(parsedBody.minStock);
        if (!Number.isNaN(minStockNum)) {
          parsedBody.lowStockThreshold = minStockNum;
        }
        delete parsedBody.minStock;
      }

      // Normalize category: accept name or ObjectId string
      if (parsedBody.category) {
        const catInput = parsedBody.category;
        if (typeof catInput === 'string' && !mongoose.Types.ObjectId.isValid(catInput)) {
          try {
            const existingCategory = await Category.findOne({ name: new RegExp(`^${catInput}$`, 'i') }).lean();
            if (existingCategory) {
              parsedBody.category = existingCategory._id;
            } else {
              const createdCategory = await Category.create({ name: catInput, status: 'active' });
              parsedBody.category = createdCategory._id;
            }
          } catch (e) {
            logger.warn('Category normalization failed', { category: catInput, error: e.message });
          }
        }
      }

      // Handle SEO fields mapping
      if (parsedBody.seoTitle || parsedBody.seoDescription || parsedBody.seoKeywords) {
        if (!product.seoInfo) product.seoInfo = {};
        
        if (parsedBody.seoTitle) product.seoInfo.metaTitle = parsedBody.seoTitle;
        if (parsedBody.seoDescription) product.seoInfo.metaDescription = parsedBody.seoDescription;
        if (parsedBody.seoKeywords) {
          product.seoInfo.keywords = Array.isArray(parsedBody.seoKeywords) 
            ? parsedBody.seoKeywords 
            : parsedBody.seoKeywords.split(',').map(k => k.trim());
        }
      }

      // Update other fields - expanded list to include new fields
      const allowedUpdates = [
        'name', 'description', 'shortDescription', 'price', 'comparePrice', 'category', 'subcategory', 
        'brand', 'sku', 'barcode', 'stock', 'lowStockThreshold', 'weight', 'dimensions',
        'productType', 'isDigital', 'isFeatured', 'variants', 'attributes', 'specifications',
        'tags', 'condition', 'quantity', 'location'
      ];

      allowedUpdates.forEach(field => {
        if (parsedBody[field] !== undefined) {
          product[field] = parsedBody[field];
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
        
        return decorateProductForResponse({
          ...product,
          averageRating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length
        });
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
