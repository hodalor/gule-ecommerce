const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Seller = require('../models/Seller');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType, requirePermission } = require('../middleware/auth');
const { validateProduct, validateProductUpdate } = require('../middleware/validation');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

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
    return { min: basePrice, max: basePrice };
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
  const availableStock = product?.productType === 'variable'
    ? (Array.isArray(product?.variants) ? product.variants : []).reduce((sum, variant) => {
        const stock = Number(variant?.stock);
        return sum + (Number.isFinite(stock) && stock > 0 ? stock : 0);
      }, 0)
    : toNumberOr(product?.stock, 0);

  return {
    ...product,
    priceRange,
    displayPrice: priceRange.min,
    availableStock,
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
        values: values.map((value) => String(value || '').trim()).filter(Boolean),
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

const safeParse = (value, fallback) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
  } catch (error) {
    return fallback;
  }

  return fallback;
};

const normalizeCategoryInput = async (categoryInput) => {
  if (!categoryInput) {
    return categoryInput;
  }

  if (typeof categoryInput === 'string' && !mongoose.Types.ObjectId.isValid(categoryInput)) {
    const existingCategory = await Category.findOne({ name: new RegExp(`^${categoryInput}$`, 'i') }).lean();
    if (existingCategory) {
      return existingCategory._id;
    }

    const createdCategory = await Category.create({ name: categoryInput, status: 'active' });
    return createdCategory._id;
  }

  return categoryInput;
};

// Get all products with admin filters (Admin only)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive', 'pending', 'rejected']).withMessage('Invalid status'),
  query('category').optional().isMongoId().withMessage('Invalid category ID'),
  query('seller').optional().isMongoId().withMessage('Invalid seller ID'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'updatedAt', 'rating']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        seller,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (category) {
        // Handle both ObjectId and category name
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(category)) {
          filter.category = category;
        } else {
          // Find category by name
          const categoryDoc = await Category.findOne({ name: { $regex: category, $options: 'i' } });
          if (categoryDoc) {
            filter.category = categoryDoc._id;
          }
        }
      }
      if (seller) {
        // Handle both ObjectId and seller name
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(seller)) {
          filter.seller = seller;
        } else {
          // Find seller by business name
          const User = require('../models/User');
          const sellerDoc = await User.findOne({ 
            businessName: { $regex: seller, $options: 'i' },
            userType: 'seller'
          });
          if (sellerDoc) {
            filter.seller = sellerDoc._id;
          }
        }
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('seller', 'businessName email contactInfo accountStatus')
          .populate('category', 'name')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Product.countDocuments(filter)
      ]);

      // Log admin product access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_PRODUCTS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        details: { 
          filter,
          totalResults: total,
          page: parseInt(page),
          limit: parseInt(limit)
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          products: products.map((product) => decorateProductForResponse(product)),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get products error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single product by ID (Admin only)
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id)
        .populate('seller', 'businessName email contactInfo accountStatus isBusinessVerified')
        .populate('category', 'name parentCategory')
        .populate('reviews', 'rating comment user createdAt')
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Log admin product view
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_PRODUCT_DETAILS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: req.params.id,
        details: { productName: product.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: { product: decorateProductForResponse(product) }
      });

    } catch (error) {
      logger.error('Admin get product error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Create product (Admin only)
router.post('/',
  authenticate,
  authorizeUserType(['admin']),
  body('sellerId').isMongoId().withMessage('Seller is required'),
  ...validateProduct,
  async (req, res) => {
    try {
      const seller = await Seller.findById(req.body.sellerId);
      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }

      let imageUrls = [];
      if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        const sources = images.map((img) => img.tempFilePath || img.data);
        const uploadResults = await uploadMultipleToCloudinary(
          sources,
          {
            folder: `gule/products/${seller._id}`,
            transformation: [
              { width: 800, height: 600, crop: 'fill', quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          }
        );

        imageUrls = uploadResults.successful.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      }

      const parsedBody = { ...req.body };
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
        seller._id
      );

      if (parsedBody.minStock !== undefined && parsedBody.lowStockThreshold === undefined) {
        const minStockNum = Number(parsedBody.minStock);
        if (!Number.isNaN(minStockNum)) {
          parsedBody.lowStockThreshold = minStockNum;
        }
        delete parsedBody.minStock;
      }

      parsedBody.category = await normalizeCategoryInput(parsedBody.category);

      const seoInfo = {};
      if (parsedBody.seoTitle) seoInfo.metaTitle = parsedBody.seoTitle;
      if (parsedBody.seoDescription) seoInfo.metaDescription = parsedBody.seoDescription;
      if (parsedBody.seoKeywords) {
        seoInfo.keywords = Array.isArray(parsedBody.seoKeywords)
          ? parsedBody.seoKeywords
          : String(parsedBody.seoKeywords).split(',').map((keyword) => keyword.trim()).filter(Boolean);
      }

      const productData = {
        ...parsedBody,
        seller: seller._id,
        images: imageUrls,
        seoInfo: Object.keys(seoInfo).length ? seoInfo : undefined
      };

      delete productData.sellerId;
      delete productData.seoTitle;
      delete productData.seoDescription;
      delete productData.seoKeywords;

      const product = new Product(productData);
      await product.save();

      await AuditLog.logAction({
        action: 'ADMIN_CREATE_PRODUCT',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: product._id,
        details: {
          productName: product.name,
          sellerId: seller._id,
          sellerName: seller.businessName,
          status: product.status
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product: decorateProductForResponse(product.toObject()) }
      });
    } catch (error) {
      logger.error('Admin create product error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update product (Admin only)
router.put('/:id',
  authenticate,
  authorizeUserType(['admin']),
  body('sellerId').optional().isMongoId().withMessage('Seller must be valid'),
  ...validateProductUpdate,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      if (req.body.sellerId) {
        const seller = await Seller.findById(req.body.sellerId);
        if (!seller) {
          return res.status(404).json({
            success: false,
            message: 'Seller not found'
          });
        }
        product.seller = seller._id;
      }

      let newImageUrls = [];
      if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        const sources = images.map((img) => img.tempFilePath || img.data);
        const uploadResults = await uploadMultipleToCloudinary(
          sources,
          {
            folder: `gule/products/${product.seller}`,
            transformation: [
              { width: 800, height: 600, crop: 'fill', quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          }
        );

        newImageUrls = uploadResults.successful.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      }

      if (req.body.removeImages) {
        const imagesToRemove = Array.isArray(req.body.removeImages) ? req.body.removeImages : [req.body.removeImages];
        for (const publicId of imagesToRemove) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (error) {
            logger.warn('Failed to delete admin-removed product image from Cloudinary', {
              publicId,
              error: error.message
            });
          }
        }

        product.images = (Array.isArray(product.images) ? product.images : []).filter(
          (img) => !imagesToRemove.includes(img.publicId)
        );
      }

      if (newImageUrls.length > 0) {
        product.images = [...(Array.isArray(product.images) ? product.images : []), ...newImageUrls];
      }

      const parsedBody = { ...req.body };
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
        product.seller
      );

      if (parsedBody.minStock !== undefined && parsedBody.lowStockThreshold === undefined) {
        const minStockNum = Number(parsedBody.minStock);
        if (!Number.isNaN(minStockNum)) {
          parsedBody.lowStockThreshold = minStockNum;
        }
        delete parsedBody.minStock;
      }

      if (parsedBody.category) {
        parsedBody.category = await normalizeCategoryInput(parsedBody.category);
      }

      if (parsedBody.seoTitle || parsedBody.seoDescription || parsedBody.seoKeywords) {
        if (!product.seoInfo) {
          product.seoInfo = {};
        }
        if (parsedBody.seoTitle) product.seoInfo.metaTitle = parsedBody.seoTitle;
        if (parsedBody.seoDescription) product.seoInfo.metaDescription = parsedBody.seoDescription;
        if (parsedBody.seoKeywords) {
          product.seoInfo.keywords = Array.isArray(parsedBody.seoKeywords)
            ? parsedBody.seoKeywords
            : String(parsedBody.seoKeywords).split(',').map((keyword) => keyword.trim()).filter(Boolean);
        }
      }

      const allowedUpdates = [
        'name', 'description', 'shortDescription', 'price', 'comparePrice', 'category', 'subcategory',
        'brand', 'sku', 'barcode', 'stock', 'lowStockThreshold', 'weight', 'dimensions', 'status',
        'productType', 'isDigital', 'isFeatured', 'variants', 'attributes', 'specifications', 'tags',
        'shippingClass', 'taxStatus', 'taxClass'
      ];

      allowedUpdates.forEach((field) => {
        if (parsedBody[field] !== undefined) {
          product[field] = parsedBody[field];
        }
      });

      await product.save();

      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_PRODUCT',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: product._id,
        details: {
          productName: product.name,
          status: product.status
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product: decorateProductForResponse(product.toObject()) }
      });
    } catch (error) {
      logger.error('Admin update product error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update product status (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  body('status').isIn(['active', 'inactive', 'pending', 'rejected']).withMessage('Invalid status'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      
      const product = await Product.findById(req.params.id)
        .populate('seller', 'businessName email');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const oldStatus = product.status;
      product.status = status;
      product.updatedAt = new Date();
      
      if (status === 'rejected' && reason) {
        product.rejectionReason = reason;
      }

      await product.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_PRODUCT_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: req.params.id,
        details: {
          productName: product.name,
          sellerId: product.seller._id,
          sellerName: product.seller.businessName,
          oldStatus,
          newStatus: status,
          reason: reason || 'No reason provided'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: `Product status updated to ${status}`,
        data: {
          product: {
            id: product._id,
            name: product.name,
            status: product.status,
            seller: product.seller
          }
        }
      });

    } catch (error) {
      logger.error('Admin update product status error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete product (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'product_management']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      const product = await Product.findById(req.params.id)
        .populate('seller', 'businessName email');

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Store product data for audit
      const productData = {
        id: product._id,
        name: product.name,
        seller: product.seller,
        category: product.category,
        price: product.price,
        status: product.status
      };

      await Product.findByIdAndDelete(req.params.id);

      // Log product deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_PRODUCT',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        resourceId: req.params.id,
        details: {
          deletedProduct: productData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: { deletedProduct: productData }
      });

    } catch (error) {
      logger.error('Admin delete product error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Bulk update products (Admin only)
router.patch('/bulk/update',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'product_management']),
  body('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required'),
  body('productIds.*').isMongoId().withMessage('Invalid product ID'),
  body('action').isIn(['activate', 'deactivate', 'approve', 'reject', 'delete']).withMessage('Invalid action'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { productIds, action, reason } = req.body;

      let updateData = {};
      let newStatus = '';

      switch (action) {
        case 'activate':
          updateData = { status: 'active', updatedAt: new Date() };
          newStatus = 'active';
          break;
        case 'deactivate':
          updateData = { status: 'inactive', updatedAt: new Date() };
          newStatus = 'inactive';
          break;
        case 'approve':
          updateData = { status: 'active', updatedAt: new Date() };
          newStatus = 'active';
          break;
        case 'reject':
          updateData = { 
            status: 'rejected', 
            rejectionReason: reason || 'Rejected by admin',
            updatedAt: new Date() 
          };
          newStatus = 'rejected';
          break;
      }

      let result;
      if (action === 'delete') {
        result = await Product.deleteMany({ _id: { $in: productIds } });
      } else {
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          updateData
        );
      }

      // Log bulk action
      await AuditLog.logAction({
        action: `ADMIN_BULK_${action.toUpperCase()}_PRODUCTS`,
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        details: {
          productIds,
          action,
          newStatus,
          reason: reason || 'No reason provided',
          affectedCount: result.modifiedCount || result.deletedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        data: {
          affectedCount: result.modifiedCount || result.deletedCount,
          action,
          newStatus
        }
      });

    } catch (error) {
      logger.error('Admin bulk update products error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get product statistics (Admin only)
router.get('/stats/summary',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactiveProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            pendingProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            rejectedProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            averagePrice: { $avg: '$price' },
            totalValue: { $sum: '$price' }
          }
        }
      ]);

      // Get category distribution
      const categoryStats = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $project: {
            categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
            count: 1
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const result = stats[0] || {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        pendingProducts: 0,
        rejectedProducts: 0,
        averagePrice: 0,
        totalValue: 0
      };

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_PRODUCT_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Product',
        details: { statisticsGenerated: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          summary: result,
          categoryDistribution: categoryStats
        }
      });

    } catch (error) {
      logger.error('Admin get product statistics error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
