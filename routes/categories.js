const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const logger = require('../utils/logger');

// Get all active categories (Public endpoint - no authentication required)
router.get('/', async (req, res) => {
  try {
    // Get all active categories with basic information
    const categories = await Category.find({ 
      status: 'active' 
    })
    .select('name description parentCategory order image')
    .populate('parentCategory', 'name')
    .sort({ order: 1, name: 1 })
    .lean();

    // Build category tree structure for better client-side usage
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create category map
    categories.forEach(category => {
      categoryMap.set(category._id.toString(), {
        ...category,
        id: category._id,
        subcategories: []
      });
    });

    // Second pass: build tree structure
    categories.forEach(category => {
      const categoryWithSubs = categoryMap.get(category._id.toString());
      
      if (category.parentCategory) {
        const parent = categoryMap.get(category.parentCategory._id.toString());
        if (parent) {
          parent.subcategories.push(categoryWithSubs);
        }
      } else {
        rootCategories.push(categoryWithSubs);
      }
    });

    // Also provide flat list for easier filtering/searching
    const flatCategories = categories.map(category => ({
      ...category,
      id: category._id
    }));

    res.json({
      success: true,
      data: {
        categories: flatCategories,
        categoryTree: rootCategories,
        total: categories.length
      }
    });

  } catch (error) {
    logger.error('Public get categories error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get category by ID (Public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({ 
      _id: req.params.id,
      status: 'active' 
    })
    .select('name description parentCategory order image')
    .populate('parentCategory', 'name')
    .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or inactive'
      });
    }

    // Get subcategories
    const subcategories = await Category.find({ 
      parentCategory: category._id,
      status: 'active'
    })
    .select('name description order image')
    .sort({ order: 1, name: 1 })
    .lean();

    const categoryWithSubs = {
      ...category,
      id: category._id,
      subcategories: subcategories.map(sub => ({
        ...sub,
        id: sub._id
      }))
    };

    res.json({
      success: true,
      data: { category: categoryWithSubs }
    });

  } catch (error) {
    logger.error('Public get category by ID error', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;