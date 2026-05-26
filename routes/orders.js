const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const Seller = require('../models/Seller');
const EscrowTransaction = require('../models/Escrow');
const Escrow = require('../models/Escrow');
const AdminSettings = require('../models/AdminSettings');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorizeUserType } = require('../middleware/auth');
const { 
  validateOrder, 
  validateOrderUpdate,
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
// Add email utilities for notifications
const { sendOrderNotification } = require('../utils/email');

const createOrderRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each user to 20 order creations per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    error: 'Too many order creation attempts, please try again later.',
    retryAfter: '1 hour'
  }
});

// Rate limiting for order operations
const orderRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many order requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to get privacy settings
const getPrivacySettings = async () => {
  try {
    const settings = await AdminSettings.find({ category: 'privacy' }).lean();
    const privacyMap = {};
    settings.forEach(setting => {
      privacyMap[setting.settingKey] = setting.value;
    });
    return privacyMap;
  } catch (error) {
    logger.error('Failed to fetch privacy settings', error);
    // Return default values if settings fetch fails
    return {
      share_buyer_contact: false,
      share_buyer_address: true
    };
  }
};

// Helper function to filter buyer information based on privacy settings
const filterBuyerInfo = (buyer, privacySettings) => {
  if (!buyer) return buyer;
  
  const filteredBuyer = { ...buyer };
  
  // If share_buyer_contact is false, remove contact information
  if (!privacySettings.share_buyer_contact) {
    delete filteredBuyer.email;
    delete filteredBuyer.phone;
    delete filteredBuyer.firstName;
    delete filteredBuyer.lastName;
    // Keep only essential info for order processing
    filteredBuyer.displayName = 'Customer';
  }
  
  return filteredBuyer;
};

// Base GET route for /api/orders - returns available endpoints
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Orders API endpoints',
    endpoints: {
      'POST /api/orders': 'Create a new order (requires authentication)',
      'GET /api/orders/my-orders': 'Get user\'s orders (requires authentication)',
      'GET /api/orders/seller-orders': 'Get seller\'s orders (requires seller authentication)',
      'GET /api/orders/:id': 'Get specific order details (requires authentication)',
      'PATCH /api/orders/:id/status': 'Update order status (requires seller authentication)',
      'PATCH /api/orders/:id/cancel': 'Cancel order (requires authentication)',
      'GET /api/orders/stats/summary': 'Get order statistics (requires seller authentication)'
    }
  });
});

// Create new order (Buyers only)
router.post('/', 
  createOrderRateLimit,
  authenticate, 
  authorizeUserType('buyer'), 
  (req, res, next) => {
    logger.info('Order creation middleware reached');
    logger.info('Request body:', req.body);
    next();
  },
  validateOrder, 
  handleValidationErrors, 
  async (req, res) => {
    const reservedStock = [];

    try {
      const { items, shippingAddress, paymentMethod, paymentStatus, paymentDetails = {}, notes } = req.body;

      logger.info('Starting order creation process');
      logger.info('Items received:', items);

      if (paymentStatus !== 'paid' || !paymentDetails.transactionId) {
        return res.status(400).json({
          success: false,
          message: 'Payment must be completed before the order can be placed'
        });
      }

      // Validate and calculate order totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        logger.info('Processing item:', item);
        const product = await Product.findById(item.product)
          .populate('seller', 'businessName');

        logger.info('Product found:', !!product);
        logger.info('Product ID:', product?._id);
        logger.info('Product seller:', product?.seller);

        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        if ((product?.status || 'inactive') !== 'active') {
          return res.status(400).json({
            success: false,
            message: `Product "${product?.name || 'Unknown Product'}" is not available for purchase`
          });
        }

        if ((product?.stock || 0) < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product?.name || 'Unknown Product'}". Available: ${product?.stock || 0}, Requested: ${item.quantity}`
          });
        }

        const itemTotal = (product?.price || 0) * item.quantity;
        subtotal += itemTotal;

        // Debug logging for product and seller
        logger.info('Product details:', {
          productId: product?._id,
          productName: product?.name,
          seller: product?.seller,
          sellerType: typeof product?.seller,
          sellerId: product?.seller?._id
        });

        orderItems.push({
          product: product?._id || null,
          seller: product?.seller?._id || product?.seller || null,
          quantity: item.quantity,
          price: product?.price || 0,
          total: itemTotal,
          productName: product?.name || 'Unknown Product',
          productImage: product?.images && product.images[0] ? product.images[0].url : null
        });

        if (product && product._id) {
          reservedStock.push({ product, quantity: item.quantity });
        }
      }

      for (const reserved of reservedStock) {
        await reserved.product.updateStock(reserved.quantity, 'subtract');
      }

      // Create OrderItem documents first
      const orderItemIds = [];
      for (const itemData of orderItems) {
        const commissionRate = 5; // 5% commission rate
        const commissionAmount = itemData.total * (commissionRate / 100);
        
        const orderItem = new OrderItem({
          product: itemData.product,
          seller: itemData.seller,
          productSnapshot: {
            name: itemData.productName,
            image: itemData.productImage
          },
          quantity: itemData.quantity,
          unitPrice: itemData.price,
          totalPrice: itemData.total,
          pricing: {
            basePrice: itemData.price
          },
          commission: {
            rate: commissionRate,
            amount: commissionAmount
          },
          status: 'pending'
        });
        
        await orderItem.save();
        orderItemIds.push(orderItem._id);
      }

      // Calculate shipping and tax (simplified calculation)
      const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
      const taxRate = 0.08; // 8% tax
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + shippingCost + taxAmount;

      // Generate order number and buyer reference
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const buyerRef = `BUYER-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create order
      const order = new Order({
        orderNumber,
        buyer: req.user.id,
        buyerRef,
        items: orderItemIds,
        subtotal,
        taxAmount,
        shippingCost,
        totalAmount,
        shippingAddress,
        paymentMethod,
        paymentDetails,
        notes,
        status: 'confirmed',
        paymentStatus: 'paid'
      });

      await order.save();

      // Create escrow transaction for each seller
      const sellerTotals = {};
      orderItems.forEach(item => {
        const sellerId = item.seller?.toString() || item.seller;
        if (sellerId && sellerId !== 'null' && !sellerTotals[sellerId]) {
          sellerTotals[sellerId] = 0;
        }
        if (sellerId && sellerId !== 'null') {
          sellerTotals[sellerId] += item.total;
        }
      });

      // Only create escrow transactions if there are valid sellers
      for (const [sellerId, amount] of Object.entries(sellerTotals)) {
        if (sellerId && sellerId !== 'null') {
          const escrowNumber = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const holdPeriod = 7; // 7 days
          const autoReleaseDate = new Date();
          autoReleaseDate.setDate(autoReleaseDate.getDate() + holdPeriod);
          
          const commission = amount * 0.05; // 5% commission
          const netAmount = amount - commission;
          
          await Escrow.create({
            escrowNumber,
            order: order._id,
            buyer: req.user.id,
            sellers: [{
              seller: sellerId,
              amount: amount,
              commission: commission,
              netAmount: netAmount,
              status: 'held'
            }],
            totalAmount: amount,
            status: 'held',
            holdPeriod: holdPeriod,
            autoReleaseDate: autoReleaseDate,
            paymentDetails: {
              transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
              paymentGateway: 'stripe', // Default gateway
              paymentMethod: order.paymentMethod
            }
          });
        }
      }

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: 'user',
        action: 'CREATE_ORDER',
        resource: 'Order',
        resourceId: order._id,
        details: {
          orderNumber: order.orderNumber,
          itemCount: orderItems.length,
          total: order.totalAmount,
          paymentMethod: order.paymentMethod
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Order created successfully', {
        orderId: order._id,
        buyerId: req.user.id,
        orderNumber: order.orderNumber,
        total: order.totalAmount
      });

      // Send order confirmation email to buyer (respect preferences)
      try {
        const buyer = await User.findById(order.buyer).select('firstName lastName email preferences');
        const optedOut = buyer?.preferences && buyer.preferences.notifications === false;
        if (optedOut) {
          logger.info('Buyer opted out; skipping order confirmation email', { orderId: order._id, buyerId: buyer?._id });
        } else {
          const itemsForEmail = (orderItems || []).map(i => ({
            name: i.productName || 'Item',
            quantity: i.quantity || 0,
            price: i.price || 0
          }));
          sendOrderNotification(
            buyer.email,
            `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Buyer',
            { orderId: order.orderNumber, status: 'Created', items: itemsForEmail, total: order.totalAmount }
          )
          .then(result => logger.info('Order confirmation email attempted', { orderId: order._id, success: result.success, messageId: result.messageId }))
          .catch(err => logger.error('Order confirmation email failed', { orderId: order._id, error: err.message }));
        }
      } catch (e) {
        logger.error('Error in order confirmation email flow', { orderId: order._id, error: e.message });
      }

      // Populate order for response
      const populatedOrder = await Order.findById(order._id)
        .populate('buyer', 'firstName lastName email')
        .populate({
          path: 'items',
          populate: [
            { path: 'product', select: 'name images stock status' },
            { path: 'seller', select: 'businessName' }
          ]
        });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order: populatedOrder }
      });

    } catch (error) {
      for (const reserved of reservedStock) {
        try {
          await reserved.product.updateStock(reserved.quantity, 'add');
        } catch (restoreError) {
          logger.error('Failed to restore reserved stock', restoreError);
        }
      }

      logger.error('Error creating order', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get user's orders (Buyers)
router.get('/my-orders', 
  orderRateLimit,
  authenticate, 
  authorizeUserType('buyer'),
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;

      const filter = { buyer: req.user.id };
      if (status) filter.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const orders = await Order.find(filter)
        .populate('items.product', 'name images')
        .populate('items.seller', 'businessName profilePicture')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Order.countDocuments(filter);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            hasNext: skip + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching user orders', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get seller's orders
router.get('/seller-orders', 
  orderRateLimit,
  authenticate, 
  authorizeUserType('seller'),
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;

      // Get privacy settings
      const privacySettings = await getPrivacySettings();

      const filter = { 'items.seller': req.user.id };
      if (status) filter.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const orders = await Order.find(filter)
        .populate('buyer', 'firstName lastName email phone profilePicture')
        .populate('items.product', 'name images')
        .populate('items.seller', '_id businessName rating')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Filter items to only show seller's items and apply privacy filtering
      const filteredOrders = orders.map(order => {
        const filteredOrder = {
          ...order,
          items: order.items.filter(item => {
            const sellerId = item.seller?._id ? item.seller._id.toString() : item.seller.toString();
            return sellerId === req.user.id;
          }),
          // Recalculate totals for seller's items only
          sellerSubtotal: order.items
            .filter(item => {
              const sellerId = item.seller?._id ? item.seller._id.toString() : item.seller.toString();
              return sellerId === req.user.id;
            })
            .reduce((sum, item) => sum + item.total, 0)
        };

        // Apply buyer information filtering based on privacy settings
        filteredOrder.buyer = filterBuyerInfo(order.buyer, privacySettings);

        // Also filter shipping address if share_buyer_address is false
        if (!privacySettings.share_buyer_address && filteredOrder.shippingAddress) {
          filteredOrder.shippingAddress = {
            city: filteredOrder.shippingAddress.city,
            state: filteredOrder.shippingAddress.state,
            country: filteredOrder.shippingAddress.country
            // Remove street, zipCode, and other detailed address info
          };
        }

        return filteredOrder;
      });

      const total = await Order.countDocuments(filter);

      res.json({
        success: true,
        data: {
          orders: filteredOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalOrders: total,
            hasNext: skip + parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching seller orders', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get single order by ID
router.get('/:id', orderRateLimit, authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'firstName lastName email phone profilePicture')
      .populate('items.product', 'name images description')
      .populate('items.seller', 'businessName profilePicture contactInfo')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has access to this order
    const isBuyer = order.buyer._id.toString() === req.user.id;
    const isSeller = order.items.some(item => item.seller._id.toString() === req.user.id);
    const isAdmin = req.user.userType === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // If seller, filter items to only show their items and apply privacy filtering
    if (isSeller && !isBuyer && !isAdmin) {
      order.items = order.items.filter(item => item.seller._id.toString() === req.user.id);
      
      // Get privacy settings and filter buyer information
      const privacySettings = await getPrivacySettings();
      order.buyer = filterBuyerInfo(order.buyer, privacySettings);
      
      // Also filter shipping address if share_buyer_address is false
      if (!privacySettings.share_buyer_address && order.shippingAddress) {
        order.shippingAddress = {
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          country: order.shippingAddress.country
          // Remove street, zipCode, and other detailed address info
        };
      }
    }

    // Get escrow transactions for this order
    const escrowTransactions = await EscrowTransaction.find({ order: order._id })
      .populate('seller', 'businessName')
      .lean();

    res.json({
      success: true,
      data: {
        order,
        escrowTransactions
      }
    });

  } catch (error) {
    logger.error('Error fetching order', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order status (Sellers can update their items)
router.patch('/:id/status', 
  orderRateLimit,
  authenticate,
  validateOrderUpdate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, trackingNumber, notes } = req.body;
      const order = await Order.findById(req.params.id).populate('items');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check permissions
      const isBuyer = order.buyer.toString() === req.user.id;
      const isSeller = order.items.some(item => item.seller.toString() === req.user.id);
      const isAdmin = req.user.userType === 'admin';

      if (!isBuyer && !isSeller && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Define allowed status transitions
      const allowedTransitions = {
        buyer: {
          'pending': ['cancelled'],
          'confirmed': ['cancelled'],
          'shipped': ['delivered', 'cancelled'],
          'delivered': ['completed']
        },
        seller: {
          'pending': ['confirmed', 'cancelled'],
          'confirmed': ['processing', 'cancelled'],
          'processing': ['shipped', 'cancelled'],
          'shipped': ['delivered']
        },
        admin: {
          'pending': ['confirmed', 'cancelled'],
          'confirmed': ['processing', 'cancelled'],
          'processing': ['shipped', 'cancelled'],
          'shipped': ['delivered', 'cancelled'],
          'delivered': ['completed', 'cancelled'],
          'cancelled': ['pending', 'confirmed']
        }
      };

      const userRole = isAdmin ? 'admin' : (isBuyer ? 'buyer' : 'seller');
      const currentStatus = order.status;

      if (!allowedTransitions[userRole][currentStatus]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change order status from ${currentStatus} to ${status}`
        });
      }

      // Update order
      const updateData = { status };
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (notes) updateData.notes = notes;
      if (status === 'shipped') updateData.shippedAt = new Date();
      if (status === 'delivered') updateData.deliveredAt = new Date();
      if (status === 'completed') updateData.completedAt = new Date();

      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      ).populate('buyer', 'firstName lastName email')
       .populate('items.product', 'name')
       .populate('items.seller', 'businessName');

      // Handle escrow release for completed orders
      if (status === 'completed') {
        await EscrowTransaction.updateMany(
          { order: order._id, status: 'held' },
          { 
            status: 'released',
            releasedAt: new Date(),
            releasedBy: req.user.id
          }
        );
      }

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: (req.user.userType === 'buyer' ? 'user' : req.user.userType),
        action: 'UPDATE_ORDER_STATUS',
        resource: 'Order',
        resourceId: order._id,
        details: {
          orderNumber: order.orderNumber,
          oldStatus: currentStatus,
          newStatus: status,
          trackingNumber,
          notes
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Order status updated', {
        orderId: order._id,
        userId: req.user.id,
        userType: req.user.userType,
        oldStatus: currentStatus,
        newStatus: status
      });

      // Send status update email to buyer (respect preferences)
      try {
        const buyer = await User.findById(order.buyer).select('firstName lastName email preferences');
        const optedOut = buyer?.preferences && buyer.preferences.notifications === false;
        if (optedOut) {
          logger.info('Buyer opted out; skipping status update email', { orderId: order._id, buyerId: buyer?._id, newStatus: status });
        } else {
          const itemsForEmail = (updatedOrder.items || []).map(item => ({
            name: (item?.productSnapshot?.name) || (item?.product?.name) || 'Item',
            quantity: item?.quantity || 0,
            price: item?.unitPrice || (item?.pricing?.basePrice || 0)
          }));
          sendOrderNotification(
            buyer.email,
            `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Buyer',
            { orderId: updatedOrder.orderNumber || order.orderNumber, status, items: itemsForEmail, total: updatedOrder.totalAmount || order.totalAmount }
          )
          .then(result => logger.info('Order status email attempted', { orderId: order._id, success: result.success, messageId: result.messageId }))
          .catch(err => logger.error('Order status email failed', { orderId: order._id, error: err.message }));
        }
      } catch (e) {
        logger.error('Error in order status email flow', { orderId: order._id, error: e.message });
      }

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order: updatedOrder }
      });

    } catch (error) {
      logger.error('Error updating order status', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Cancel order (Buyers and Sellers)
router.patch('/:id/cancel', orderRateLimit, authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id).populate('items');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    const isBuyer = order.buyer.toString() === req.user.id;
    const isSeller = order.items.some(item => item.seller.toString() === req.user.id);
    const isAdmin = req.user.userType === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    // Update order status
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: req.user.id,
        cancellationReason: reason
      },
      { new: true }
    ).populate('buyer', 'firstName lastName email')
     .populate('items.product', 'name')
     .populate('items.seller', 'businessName');

    if (order.paymentStatus === 'paid') {
      for (const item of order.items) {
        const productId = item.product?._id || item.product;
        if (!productId) continue;
        const product = await Product.findById(productId);
        if (product) {
          await product.updateStock(item.quantity, 'add');
        }
      }
    }

    // Cancel escrow transactions
    await EscrowTransaction.updateMany(
      { order: order._id, status: { $in: ['pending', 'held'] } },
      { 
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: req.user.id
      }
    );

      // Log audit trail
      await AuditLog.create({
        user: req.user.id,
        userType: (req.user.userType === 'buyer' ? 'user' : req.user.userType),
        action: 'CANCEL_ORDER',
        resource: 'Order',
        resourceId: order._id,
        details: {
          orderNumber: order.orderNumber,
          reason,
          cancelledBy: (req.user.userType === 'buyer' ? 'user' : req.user.userType)
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

    logger.info('Order cancelled', {
      orderId: order._id,
      userId: req.user.id,
      userType: req.user.userType,
      reason
    });

    // Send cancellation email to buyer (respect preferences)
    try {
      const buyer = await User.findById(order.buyer).select('firstName lastName email preferences');
      const optedOut = buyer?.preferences && buyer.preferences.notifications === false;
      if (optedOut) {
        logger.info('Buyer opted out; skipping cancellation email', { orderId: order._id, buyerId: buyer?._id });
      } else {
        const itemsForEmail = (updatedOrder.items || []).map(item => ({
          name: (item?.productSnapshot?.name) || (item?.product?.name) || 'Item',
          quantity: item?.quantity || 0,
          price: item?.unitPrice || (item?.pricing?.basePrice || 0)
        }));
        sendOrderNotification(
          buyer.email,
          `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'Buyer',
          { orderId: updatedOrder.orderNumber || order.orderNumber, status: 'Cancelled', items: itemsForEmail, total: updatedOrder.totalAmount || order.totalAmount }
        )
        .then(result => logger.info('Order cancellation email attempted', { orderId: order._id, success: result.success, messageId: result.messageId }))
        .catch(err => logger.error('Order cancellation email failed', { orderId: order._id, error: err.message }));
      }
    } catch (e) {
      logger.error('Error in order cancellation email flow', { orderId: order._id, error: e.message });
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order: updatedOrder }
    });

  } catch (error) {
    logger.error('Error cancelling order', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get order statistics (for dashboard)
router.get('/stats/summary', orderRateLimit, authenticate, async (req, res) => {
  try {
    let matchFilter = {};

    // Filter based on user type
    if (req.user.userType === 'buyer') {
      matchFilter.buyer = req.user.id;
    } else if (req.user.userType === 'seller') {
      matchFilter['items.seller'] = req.user.id;
    }
    // Admin can see all orders (no filter)

    const stats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      averageOrderValue: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error fetching order statistics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
