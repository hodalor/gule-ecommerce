const mongoose = require('mongoose');
require('dotenv').config();

// Load all models
require('./models/Product');
require('./models/Seller');
require('./models/Order');
require('./models/User');
require('./models/AuditLog');
require('./models/Escrow');

const Product = mongoose.model('Product');
const Order = mongoose.model('Order');
const User = mongoose.model('User');
const AuditLog = mongoose.model('AuditLog');
const EscrowTransaction = mongoose.model('EscrowTransaction');

async function debugFullOrderCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find a product
    console.log('Step 1: Finding product...');
    const product = await Product.findById('68ee979261dec9616722ea46').populate('seller');
    console.log('Product found:', !!product);
    console.log('Product seller:', product?.seller);
    
    // Find user
    console.log('Step 2: Finding user...');
    const user = await User.findById('68ee96fc3e9e00254fc7e2bf');
    console.log('User found:', !!user);
    
    // Create order items
    console.log('Step 3: Creating order items...');
    const orderItems = [];
    const itemTotal = product.price * 1;
    
    orderItems.push({
      product: product._id,
      seller: product.seller?._id || product.seller || null,
      quantity: 1,
      price: product.price,
      total: itemTotal,
      productName: product.name,
      productImage: product.images && product.images[0] ? product.images[0].url : null
    });
    
    console.log('Order items created:', orderItems);
    
    // Create order
    console.log('Step 4: Creating order...');
    const orderNumber = 'ORD-' + Date.now();
    const subtotal = itemTotal;
    const shippingCost = 10;
    const tax = subtotal * 0.1;
    const total = subtotal + shippingCost + tax;
    
    const order = new Order({
      orderNumber,
      buyer: user._id,
      items: orderItems,
      subtotal,
      shippingCost,
      tax,
      total,
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      paymentMethod: 'stripe',
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    console.log('Order object created, saving...');
    await order.save();
    console.log('Order saved successfully:', order._id);
    
    // Create escrow transactions
    console.log('Step 5: Creating escrow transactions...');
    const sellerTotals = {};
    orderItems.forEach(item => {
      const sellerId = item.seller?.toString() || item.seller;
      console.log('Processing item seller:', sellerId, typeof sellerId);
      if (sellerId && sellerId !== 'null' && !sellerTotals[sellerId]) {
        sellerTotals[sellerId] = 0;
      }
      if (sellerId && sellerId !== 'null') {
        sellerTotals[sellerId] += item.total;
      }
    });
    
    console.log('Seller totals:', sellerTotals);
    
    for (const [sellerId, amount] of Object.entries(sellerTotals)) {
      if (sellerId && sellerId !== 'null') {
        console.log('Creating escrow for seller:', sellerId, 'amount:', amount);
        await EscrowTransaction.create({
          order: order._id,
          buyer: user._id,
          seller: sellerId,
          amount,
          status: 'pending',
          type: 'purchase'
        });
      }
    }
    
    console.log('Escrow transactions created');
    
    // Create audit log
    console.log('Step 6: Creating audit log...');
    await AuditLog.create({
      user: user._id,
      userType: 'buyer',
      action: 'CREATE_ORDER',
      resource: 'Order',
      resourceId: order._id,
      details: {
        orderNumber: order.orderNumber,
        itemCount: orderItems.length,
        total: order.total,
        paymentMethod: order.paymentMethod
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Debug Script'
    });
    
    console.log('Audit log created');
    
    // Populate order
    console.log('Step 7: Populating order...');
    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'firstName lastName email')
      .populate({
        path: 'items.product',
        select: 'name images'
      })
      .populate({
        path: 'items.seller',
        select: 'businessName'
      });
    
    console.log('Order populated successfully');
    console.log('Final order:', JSON.stringify(populatedOrder, null, 2));
    
  } catch (error) {
    console.error('Error at step:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

debugFullOrderCreation();
