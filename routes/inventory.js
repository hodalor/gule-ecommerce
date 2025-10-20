const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { validatePagination, handleValidationErrors } = require('../middleware/validation');
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting
const inventoryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each seller to 100 requests per windowMs
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many inventory requests, please try again later.',
    retryAfter: '15 minutes'
  }
});

// Get seller's inventory
router.get('/',
  inventoryRateLimit,
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    query('status').optional().isIn(['active', 'inactive', 'out_of_stock', 'low_stock', 'discontinued']),
    query('alertsOnly').optional().isBoolean(),
    query('search').optional().isString().trim(),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, alertsOnly, search, sort = '-updatedAt' } = req.query;
      const skip = (page - 1) * limit;

      let filter = {};
      
      // For sellers, only show their inventory
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      if (status) filter.status = status;
      if (alertsOnly === 'true') {
        filter['alerts.0'] = { $exists: true };
      }

      if (search) {
        filter.$or = [
          { sku: { $regex: search, $options: 'i' } },
          { 'location.warehouse': { $regex: search, $options: 'i' } },
          { 'location.zone': { $regex: search, $options: 'i' } }
        ];
      }

      const inventory = await Inventory.find(filter)
        .populate([
          { path: 'productId', select: 'name images category price status' },
          { path: 'sellerId', select: 'businessName email' }
        ])
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Inventory.countDocuments(filter);

      res.json({
        success: true,
        data: {
          inventory,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory',
        error: error.message
      });
    }
  }
);

// Get inventory by product ID
router.get('/product/:productId',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [param('productId').isMongoId()],
  handleValidationErrors,
  async (req, res) => {
    try {
      let filter = { productId: req.params.productId };
      
      // For sellers, only show their inventory
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      const inventory = await Inventory.findOne(filter)
        .populate([
          { path: 'productId', select: 'name images category price status' },
          { path: 'sellerId', select: 'businessName email' }
        ]);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory not found'
        });
      }

      res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory',
        error: error.message
      });
    }
  }
);

// Create or update inventory
router.post('/',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    body('productId').isMongoId(),
    body('sku').optional().isString().trim(),
    body('currentStock').isInt({ min: 0 }),
    body('minimumStock').optional().isInt({ min: 0 }),
    body('maximumStock').optional().isInt({ min: 0 }),
    body('reorderPoint').optional().isInt({ min: 0 }),
    body('reorderQuantity').optional().isInt({ min: 1 }),
    body('costPrice').optional().isFloat({ min: 0 }),
    body('sellingPrice').optional().isFloat({ min: 0 }),
    body('location').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Verify product exists and belongs to seller
      const product = await Product.findById(req.body.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      if (req.user.userType === 'seller' && product.seller.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const inventoryData = {
        ...req.body,
        sellerId: req.user.userType === 'seller' ? req.user.id : product.seller
      };

      // Check if inventory already exists
      const existingInventory = await Inventory.findOne({
        productId: req.body.productId,
        sellerId: inventoryData.sellerId
      });

      let inventory;
      if (existingInventory) {
        // Update existing inventory
        Object.assign(existingInventory, inventoryData);
        inventory = await existingInventory.save();
      } else {
        // Create new inventory
        inventory = new Inventory(inventoryData);
        await inventory.save();
      }

      await inventory.populate([
        { path: 'productId', select: 'name images category price' },
        { path: 'sellerId', select: 'businessName email' }
      ]);

      res.status(existingInventory ? 200 : 201).json({
        success: true,
        message: `Inventory ${existingInventory ? 'updated' : 'created'} successfully`,
        data: inventory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to save inventory',
        error: error.message
      });
    }
  }
);

// Update stock levels
router.patch('/:id/stock',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    param('id').isMongoId(),
    body('action').isIn(['add', 'remove', 'set']),
    body('quantity').isInt({ min: 0 }),
    body('reason').optional().isString().trim(),
    body('reference').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      let filter = { _id: req.params.id };
      
      // For sellers, only allow updating their inventory
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      const inventory = await Inventory.findOne(filter);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory not found'
        });
      }

      const { action, quantity, reason, reference } = req.body;
      let newStock = inventory.currentStock;

      switch (action) {
        case 'add':
          newStock += quantity;
          break;
        case 'remove':
          newStock = Math.max(0, newStock - quantity);
          break;
        case 'set':
          newStock = quantity;
          break;
      }

      // Add stock movement record
      const movement = {
        type: action === 'add' ? 'in' : 'out',
        quantity: action === 'set' ? Math.abs(newStock - inventory.currentStock) : quantity,
        reason: reason || `Stock ${action}`,
        reference,
        previousStock: inventory.currentStock,
        newStock,
        performedBy: req.user.id
      };

      inventory.addStockMovement(movement);
      inventory.currentStock = newStock;

      await inventory.save();

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: inventory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update stock',
        error: error.message
      });
    }
  }
);

// Get stock movements
router.get('/:id/movements',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    param('id').isMongoId(),
    validatePagination
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      let filter = { _id: req.params.id };
      
      // For sellers, only show their inventory
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      const inventory = await Inventory.findOne(filter)
        .populate('stockMovements.performedBy', 'username email');

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory not found'
        });
      }

      const movements = inventory.stockMovements
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(skip, skip + parseInt(limit));

      const total = inventory.stockMovements.length;

      res.json({
        success: true,
        data: {
          movements,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock movements',
        error: error.message
      });
    }
  }
);

// Get low stock alerts
router.get('/alerts/low-stock',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  async (req, res) => {
    try {
      let filter = {
        $expr: {
          $lte: ['$currentStock', '$reorderPoint']
        },
        status: 'active'
      };

      // For sellers, only show their inventory
      if (req.user.userType === 'seller') {
        filter.sellerId = req.user.id;
      }

      const lowStockItems = await Inventory.find(filter)
        .populate([
          { path: 'productId', select: 'name images category' },
          { path: 'sellerId', select: 'businessName email' }
        ])
        .sort({ currentStock: 1 });

      res.json({
        success: true,
        data: lowStockItems
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch low stock alerts',
        error: error.message
      });
    }
  }
);

// Get inventory statistics
router.get('/statistics/overview',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  async (req, res) => {
    try {
      let matchFilter = {};
      
      // For sellers, only show their inventory stats
      if (req.user.userType === 'seller') {
        matchFilter.sellerId = req.user.id;
      }

      const stats = await Inventory.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
            lowStockItems: {
              $sum: {
                $cond: [
                  { $lte: ['$currentStock', '$reorderPoint'] },
                  1,
                  0
                ]
              }
            },
            outOfStockItems: {
              $sum: {
                $cond: [
                  { $eq: ['$currentStock', 0] },
                  1,
                  0
                ]
              }
            },
            avgTurnoverRate: { $avg: '$turnoverRate' }
          }
        }
      ]);

      const statusBreakdown = await Inventory.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalStock: { $sum: '$currentStock' }
          }
        }
      ]);

      res.json({
        success: true,
        data: {
          overview: stats[0] || {},
          statusBreakdown
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory statistics',
        error: error.message
      });
    }
  }
);

// Bulk update inventory
router.patch('/bulk-update',
  authenticate,
  authorizeUserType(['seller', 'admin']),
  [
    body('updates').isArray({ min: 1 }),
    body('updates.*.inventoryId').isMongoId(),
    body('updates.*.action').isIn(['add', 'remove', 'set']),
    body('updates.*.quantity').isInt({ min: 0 }),
    body('updates.*.reason').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { updates } = req.body;
      const results = [];

      for (const update of updates) {
        try {
          let filter = { _id: update.inventoryId };
          
          // For sellers, only allow updating their inventory
          if (req.user.userType === 'seller') {
            filter.sellerId = req.user.id;
          }

          const inventory = await Inventory.findOne(filter);

          if (!inventory) {
            results.push({
              inventoryId: update.inventoryId,
              success: false,
              message: 'Inventory not found'
            });
            continue;
          }

          let newStock = inventory.currentStock;

          switch (update.action) {
            case 'add':
              newStock += update.quantity;
              break;
            case 'remove':
              newStock = Math.max(0, newStock - update.quantity);
              break;
            case 'set':
              newStock = update.quantity;
              break;
          }

          // Add stock movement record
          const movement = {
            type: update.action === 'add' ? 'in' : 'out',
            quantity: update.action === 'set' ? Math.abs(newStock - inventory.currentStock) : update.quantity,
            reason: update.reason || `Bulk ${update.action}`,
            previousStock: inventory.currentStock,
            newStock,
            performedBy: req.user.id
          };

          inventory.addStockMovement(movement);
          inventory.currentStock = newStock;

          await inventory.save();

          results.push({
            inventoryId: update.inventoryId,
            success: true,
            message: 'Stock updated successfully',
            newStock
          });
        } catch (error) {
          results.push({
            inventoryId: update.inventoryId,
            success: false,
            message: error.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Bulk update completed',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk update',
        error: error.message
      });
    }
  }
);

module.exports = router;