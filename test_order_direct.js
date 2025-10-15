require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const { Order, OrderItem, User, Seller, Product } = require('./models');

async function testOrderDirectly() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the seller ID
    const sellerId = '68ed7a4b9e60579ff9b6bc00';
    
    // Find orders for this seller
    const orders = await Order.find({ 'sellers.seller': sellerId })
      .populate('buyer', 'firstName lastName email')
      .populate('items')
      .sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders for seller ${sellerId}`);

    if (orders.length > 0) {
      const testOrder = orders[0];
      console.log('\nTest Order Details:');
      console.log('Order ID:', testOrder._id);
      console.log('Order Number:', testOrder.orderNumber);
      console.log('Current Status:', testOrder.status);
      console.log('Payment Status:', testOrder.paymentStatus);
      console.log('Total Amount:', testOrder.totalAmount);
      console.log('Buyer:', testOrder.buyer.firstName, testOrder.buyer.lastName);
      console.log('Items:', testOrder.items.length);

      // Test status progression: pending -> confirmed -> processing -> shipped
      const statusUpdates = ['confirmed', 'processing', 'shipped'];

      for (const newStatus of statusUpdates) {
        console.log(`\nUpdating order status from ${testOrder.status} to ${newStatus}...`);
        
        try {
          // Update the order status directly in database
          testOrder.status = newStatus;
          
          // Update seller-specific status in the sellers array
          const sellerData = testOrder.sellers.find(s => s.seller.toString() === sellerId);
          if (sellerData) {
            sellerData.status = newStatus;
            if (newStatus === 'shipped') {
              sellerData.shippedAt = new Date();
            }
          }

          // Set timestamps based on status
          if (newStatus === 'shipped') {
            testOrder.shippedAt = new Date();
          } else if (newStatus === 'delivered') {
            testOrder.deliveredAt = new Date();
          }

          await testOrder.save();
          console.log(`✅ Status updated successfully to: ${newStatus}`);
          
          // Verify the update
          const updatedOrder = await Order.findById(testOrder._id);
          console.log(`Verified status: ${updatedOrder.status}`);
          
        } catch (error) {
          console.log(`❌ Failed to update status to ${newStatus}:`, error.message);
        }

        // Wait a bit between updates
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test adding tracking number
      console.log('\nTesting tracking number addition...');
      try {
        const trackingNumber = `TRK-${Date.now()}`;
        
        // Find seller data in the order
        const sellerData = testOrder.sellers.find(s => s.seller.toString() === sellerId);
        if (sellerData) {
          sellerData.trackingNumber = trackingNumber;
          await testOrder.save();
          console.log(`✅ Tracking number added: ${trackingNumber}`);
        }
      } catch (error) {
        console.log('❌ Failed to add tracking number:', error.message);
      }

    } else {
      console.log('No orders found for this seller. Creating a test order first...');
      
      // Run the create test order script
      const { execSync } = require('child_process');
      try {
        execSync('node create_test_order.js', { stdio: 'inherit' });
        console.log('Test order created. Re-running status test...');
        
        // Recursively call this function to test with the new order
        await testOrderDirectly();
        return;
      } catch (error) {
        console.log('Failed to create test order:', error.message);
      }
    }

  } catch (error) {
    console.error('Error in direct order test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testOrderDirectly();