require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// Import models
const { Order, OrderItem, User, Seller, Product } = require('./models');

async function testOrderStatusUpdates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the seller ID and create a token
    const sellerId = '68ed7a4b9e60579ff9b6bc00';
    
    // Create JWT token for the seller
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        sellerId: sellerId,
        userType: 'seller'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated seller token');

    // First, get all orders for this seller
    const response = await axios.get('http://localhost:5000/api/orders/seller-orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Seller orders:', response.data);

    if (response.data.data && response.data.data.orders && response.data.data.orders.length > 0) {
      const testOrder = response.data.data.orders[0];
      const orderId = testOrder._id;
      
      console.log(`\nTesting order status updates for order: ${orderId}`);
      console.log(`Current status: ${testOrder.status}`);

      // Test status progression: pending -> confirmed -> processing -> shipped
      const statusUpdates = [
        { status: 'confirmed', description: 'Order confirmed by seller' },
        { status: 'processing', description: 'Order is being processed' },
        { status: 'shipped', description: 'Order has been shipped' }
      ];

      for (const update of statusUpdates) {
        console.log(`\nUpdating order status to: ${update.status}`);
        
        try {
          const updateResponse = await axios.patch(
            `http://localhost:5000/api/orders/${orderId}/status`,
            { 
              status: update.status,
              notes: update.description
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          console.log(`✅ Status updated successfully to: ${update.status}`);
          console.log('Response:', updateResponse.data);
        } catch (error) {
          console.log(`❌ Failed to update status to ${update.status}:`);
          if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
          } else {
            console.log('Error:', error.message);
          }
        }

        // Wait a bit between updates
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('No orders found for this seller');
    }

  } catch (error) {
    console.error('Error testing order status updates:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testOrderStatusUpdates();