const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType, requirePermission } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const { uploadToCloudinary } = require('../utils/cloudinary');
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

// Get all categories with admin filters (Admin only)
router.get('/',
  authenticate,
  authorizeUserType(['admin']),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('parent').optional().isMongoId().withMessage('Invalid parent category ID'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy').optional().isIn(['name', 'createdAt', 'updatedAt', 'order']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        parent,
        search,
        sortBy = 'order',
        sortOrder = 'asc'
      } = req.query;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (parent) filter.parentCategory = parent;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        Category.find(filter)
          .populate('parentCategory', 'name')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Category.countDocuments(filter)
      ]);

      // Get product count for each category
      const categoriesWithStats = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.countDocuments({ category: category._id });
          return {
            ...category,
            stats: {
              totalProducts: productCount
            }
          };
        })
      );

      // Log admin category access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_CATEGORIES',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
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
          categories: categoriesWithStats,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Admin get categories error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get category tree (Admin only)
router.get('/tree',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      // Get all categories
      const categories = await Category.find({})
        .sort({ order: 1, name: 1 })
        .lean();

      // Build category tree
      const buildTree = (parentId = null) => {
        return categories
          .filter(cat => {
            if (parentId === null) {
              return !cat.parentCategory;
            }
            return cat.parentCategory && cat.parentCategory.toString() === parentId.toString();
          })
          .map(cat => ({
            ...cat,
            children: buildTree(cat._id)
          }));
      };

      const categoryTree = buildTree();

      // Log category tree access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_CATEGORY_TREE',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        details: { totalCategories: categories.length },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: { categoryTree }
      });

    } catch (error) {
      logger.error('Admin get category tree error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category tree',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single category by ID (Admin only)
router.get('/:id',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id)
        .populate('parentCategory', 'name')
        .lean();

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Get subcategories
      const subcategories = await Category.find({ parentCategory: category._id })
        .select('name status order')
        .sort({ order: 1 })
        .lean();

      // Get category statistics
      const [productCount, activeProductCount] = await Promise.all([
        Product.countDocuments({ category: category._id }),
        Product.countDocuments({ category: category._id, status: 'active' })
      ]);

      const categoryWithStats = {
        ...category,
        subcategories,
        stats: {
          totalProducts: productCount,
          activeProducts: activeProductCount,
          subcategoryCount: subcategories.length
        }
      };

      // Log admin category view
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_CATEGORY_DETAILS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        resourceId: req.params.id,
        details: { categoryName: category.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: { category: categoryWithStats }
      });

    } catch (error) {
      logger.error('Admin get category error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Create new category (Admin only)
router.post('/',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'category_management']),
  body('name').notEmpty().isLength({ min: 1, max: 100 }).withMessage('Category name is required and must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, parentCategory, status = 'active', order = 0 } = req.body;
      const imageUpload = req.files?.image;
      const uploadedImage = imageUpload
        ? await uploadToCloudinary(imageUpload.tempFilePath || imageUpload.data, { folder: 'categories' })
        : null;

      // Check if category name already exists at the same level
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        parentCategory: parentCategory || null
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'Category name already exists at this level'
        });
      }

      // Validate parent category if provided
      if (parentCategory) {
        const parent = await Category.findById(parentCategory);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: 'Parent category not found'
          });
        }
      }

      const category = new Category({
        name,
        description,
        parentCategory: parentCategory || null,
        status,
        order,
        image: uploadedImage
          ? { url: uploadedImage.secure_url || uploadedImage.url, alt: name }
          : undefined
      });

      await category.save();

      // Log category creation
      await AuditLog.logAction({
        action: 'ADMIN_CREATE_CATEGORY',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        resourceId: category._id,
        details: {
          categoryName: category.name,
          parentCategory: parentCategory || null,
          status
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category }
      });

    } catch (error) {
      logger.error('Admin create category error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update category (Admin only)
router.put('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'category_management']),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Category name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('parentCategory').optional().isMongoId().withMessage('Invalid parent category ID'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const { name, description, parentCategory, status, order } = req.body;
      const imageUpload = req.files?.image;
      const uploadedImage = imageUpload
        ? await uploadToCloudinary(imageUpload.tempFilePath || imageUpload.data, { folder: 'categories' })
        : null;

      // Store original data for audit
      const originalData = {
        name: category.name,
        description: category.description,
        parentCategory: category.parentCategory,
        status: category.status,
        order: category.order
      };

      // Check if new name conflicts with existing categories
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') },
          parentCategory: parentCategory !== undefined ? parentCategory : category.parentCategory,
          _id: { $ne: req.params.id }
        });

        if (existingCategory) {
          return res.status(409).json({
            success: false,
            message: 'Category name already exists at this level'
          });
        }
      }

      // Validate parent category if provided
      if (parentCategory) {
        // Prevent circular reference
        if (parentCategory === req.params.id) {
          return res.status(400).json({
            success: false,
            message: 'Category cannot be its own parent'
          });
        }

        const parent = await Category.findById(parentCategory);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: 'Parent category not found'
          });
        }
      }

      // Update fields
      if (name !== undefined) category.name = name;
      if (description !== undefined) category.description = description;
      if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
      if (status !== undefined) category.status = status;
      if (order !== undefined) category.order = order;
      if (uploadedImage) {
        category.image = { url: uploadedImage.secure_url || uploadedImage.url, alt: category.name };
      }

      category.updatedAt = new Date();
      await category.save();

      // Log category update
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_CATEGORY',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        resourceId: req.params.id,
        details: {
          categoryName: category.name,
          originalData,
          updatedData: req.body
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: { category }
      });

    } catch (error) {
      logger.error('Admin update category error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Update category status (Admin only)
router.patch('/:id/status',
  authenticate,
  authorizeUserType(['admin']),
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status } = req.body;
      
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const oldStatus = category.status;
      category.status = status;
      category.updatedAt = new Date();

      await category.save();

      // Log status change
      await AuditLog.logAction({
        action: 'ADMIN_UPDATE_CATEGORY_STATUS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        resourceId: req.params.id,
        details: {
          categoryName: category.name,
          oldStatus,
          newStatus: status
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: `Category status updated to ${status}`,
        data: {
          category: {
            id: category._id,
            name: category.name,
            status: category.status
          }
        }
      });

    } catch (error) {
      logger.error('Admin update category status error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Bulk update categories (Admin only)
router.patch('/bulk',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'category_management']),
  body('categoryIds').isArray({ min: 1 }).withMessage('Category IDs must be a non-empty array'),
  body('categoryIds.*').isMongoId().withMessage('Invalid category ID'),
  body('action').isIn(['activate', 'deactivate']).withMessage('Invalid bulk action'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { categoryIds, action } = req.body;
      const newStatus = action === 'activate' ? 'active' : 'inactive';

      const result = await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );

      await AuditLog.logAction({
        action: 'ADMIN_BULK_UPDATE_CATEGORIES',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        details: {
          categoryIds,
          action,
          updatedCount: result.modifiedCount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: `Updated ${result.modifiedCount} categories`,
        data: {
          updatedCount: result.modifiedCount,
          status: newStatus
        }
      });
    } catch (error) {
      logger.error('Admin bulk update categories error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Delete category (Admin only)
router.delete('/:id',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin']),
  body('reason').notEmpty().withMessage('Reason for deletion is required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category has products
      const productCount = await Product.countDocuments({ category: category._id });
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing products',
          data: { productCount }
        });
      }

      // Check if category has subcategories
      const subcategoryCount = await Category.countDocuments({ parentCategory: category._id });
      if (subcategoryCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with subcategories',
          data: { subcategoryCount }
        });
      }

      // Store category data for audit
      const categoryData = {
        id: category._id,
        name: category.name,
        description: category.description,
        parentCategory: category.parentCategory,
        status: category.status,
        order: category.order
      };

      await Category.findByIdAndDelete(req.params.id);

      // Log category deletion
      await AuditLog.logAction({
        action: 'ADMIN_DELETE_CATEGORY',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        resourceId: req.params.id,
        details: {
          deletedCategory: categoryData,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'high'
      });

      res.json({
        success: true,
        message: 'Category deleted successfully',
        data: { deletedCategory: categoryData }
      });

    } catch (error) {
      logger.error('Admin delete category error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Reorder categories (Admin only)
router.patch('/reorder',
  authenticate,
  authorizeUserType(['admin']),
  requirePermission(['super_admin', 'category_management']),
  body('categories').isArray({ min: 1 }).withMessage('Categories array is required'),
  body('categories.*.id').isMongoId().withMessage('Invalid category ID'),
  body('categories.*.order').isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { categories } = req.body;

      // Update order for each category
      const updatePromises = categories.map(({ id, order }) =>
        Category.findByIdAndUpdate(id, { order, updatedAt: new Date() })
      );

      await Promise.all(updatePromises);

      // Log reorder action
      await AuditLog.logAction({
        action: 'ADMIN_REORDER_CATEGORIES',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        details: {
          reorderedCategories: categories,
          categoryCount: categories.length
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      });

      res.json({
        success: true,
        message: 'Categories reordered successfully',
        data: { updatedCount: categories.length }
      });

    } catch (error) {
      logger.error('Admin reorder categories error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder categories',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get category statistics (Admin only)
router.get('/stats/summary',
  authenticate,
  authorizeUserType(['admin']),
  async (req, res) => {
    try {
      const stats = await Category.aggregate([
        {
          $group: {
            _id: null,
            totalCategories: { $sum: 1 },
            activeCategories: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactiveCategories: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            rootCategories: {
              $sum: { $cond: [{ $eq: ['$parentCategory', null] }, 1, 0] }
            }
          }
        }
      ]);

      // Get category hierarchy depth
      const categoryHierarchy = await Category.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'parentCategory',
            foreignField: '_id',
            as: 'parent'
          }
        },
        {
          $addFields: {
            level: {
              $cond: [
                { $eq: ['$parentCategory', null] },
                0,
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const result = stats[0] || {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        rootCategories: 0
      };

      const totalProducts = await Product.countDocuments({});
      result.totalProducts = totalProducts;

      // Log statistics access
      await AuditLog.logAction({
        action: 'ADMIN_VIEW_CATEGORY_STATISTICS',
        userId: req.user.id,
        userType: 'admin',
        resourceType: 'Category',
        details: { statisticsGenerated: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'low'
      });

      res.json({
        success: true,
        data: {
          summary: result,
          hierarchy: categoryHierarchy
        }
      });

    } catch (error) {
      logger.error('Admin get category statistics error', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
