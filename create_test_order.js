const mongoose = require('mongoose');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function createTestOrder() {
  try {
    // IDs from our previous operations
    const sellerId = '68ed7a4b9e60579ff9b6bc00';
    const productId = '68ed816f9d4bceee45b454af';
    
    // First, let's find or create a test user (buyer)
    let buyer = await User.findOne({ email: 'testbuyer@example.com' });
    
    if (!buyer) {
      buyer = new User({
        firstName: 'Test',
        lastName: 'Buyer',
        email: 'testbuyer@example.com',
        password: 'hashedpassword123', // In real app, this would be properly hashed
        phone: '+260123456789',
        isActive: true,
        isVerified: true
      });
      await buyer.save();
      console.log('Created test buyer:', buyer._id);
    } else {
      console.log('Using existing test buyer:', buyer._id);
    }
    
    // Create order items first
    const orderItem = new OrderItem({
      product: productId,
      seller: sellerId,
      productSnapshot: {
        name: 'Test Electronics Product',
        description: 'A high-quality test product for debugging and testing purposes',
        image: 'https://example.com/image1.jpg',
        sku: 'TEST-ELEC-001',
        category: 'Electronics'
      },
      quantity: 2,
      unitPrice: 29.99,
      totalPrice: 59.98,
      pricing: {
        basePrice: 29.99,
        variantPrice: 0,
        customizationPrice: 0,
        discountAmount: 0,
        taxAmount: 0
      },
      commission: {
        rate: 10,
        amount: 5.99
      }
    });
    
    const savedOrderItem = await orderItem.save();
    console.log('Created order item:', savedOrderItem._id);
    
    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const buyerRef = `BUYER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the main order
    const orderData = {
      orderNumber: orderNumber,
      buyer: buyer._id,  // Changed from 'savedBuyer' to 'buyer'
      buyerRef: buyerRef,
      items: [savedOrderItem._id],
      sellers: [{
        seller: sellerId,
        items: [savedOrderItem._id],
        subtotal: 59.98,
        commission: 5.99,
        status: 'pending'
      }],
      subtotal: 59.98,
      totalAmount: 59.98,
      status: 'pending',  // Changed from 'orderStatus' to 'status'
      paymentStatus: 'pending',
      paymentMethod: 'card',
      shippingAddress: {
        firstName: 'Test',
        lastName: 'Buyer',
        phone: '+260123456789',
        street: '123 Test Street',
        city: 'Lusaka',
        state: 'Lusaka Province',
        zipCode: '10101',
        country: 'Zambia'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'Buyer',
        phone: '+260123456789',
        street: '123 Test Street',
        city: 'Lusaka',
        state: 'Lusaka Province',
        zipCode: '10101',
        country: 'Zambia'
      },
      shippingCost: 0,
      taxAmount: 0,
      discountAmount: 0
    };
    
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    console.log('Test order created successfully!');
    console.log('Order ID:', savedOrder._id);
    console.log('Order Status:', savedOrder.status);
    console.log('Total Amount:', savedOrder.totalAmount);
    console.log('Buyer ID:', savedOrder.buyer);
    console.log('Items:', savedOrder.items);
    
  } catch (error) {
    console.error('Error creating test order:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestOrder();