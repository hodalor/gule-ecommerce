require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Import models
const { Order, OrderItem, User, Seller, Product, Review } = require('./models');

async function testSellerStatistics() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the seller ID
    const sellerId = '68ed7a4b9e60579ff9b6bc00';
    
    // Generate JWT token for the seller
    const token = jwt.sign(
      { 
        id: sellerId, 
        userType: 'seller',
        email: 'testseller@example.com'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated JWT token for seller');

    // Test 1: Get seller statistics via API
    console.log('\n=== Testing Seller Statistics API ===');
    
    try {
      const response = await axios.get(`http://localhost:5000/api/sellers/${sellerId}/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Statistics API call successful');
      console.log('Response status:', response.status);
      
      const stats = response.data.statistics;
      console.log('\n📊 Seller Statistics:');
      console.log('Seller Info:', {
        name: stats.seller.name,
        businessName: stats.seller.businessName,
        email: stats.seller.email,
        accountStatus: stats.seller.accountStatus,
        isBusinessVerified: stats.seller.isBusinessVerified
      });
      
      console.log('\n📦 Product Statistics:', stats.products);
      console.log('📋 Order Statistics:', stats.orders);
      console.log('⭐ Review Statistics:', stats.reviews);

    } catch (error) {
      console.log('❌ Statistics API call failed:', error.response?.data || error.message);
    }

    // Test 2: Direct database statistics calculation
    console.log('\n=== Testing Direct Database Statistics ===');
    
    try {
      const seller = await Seller.findById(sellerId);
      if (!seller) {
        console.log('❌ Seller not found');
        return;
      }

      // Get product statistics
      const productStats = await Product.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            pendingProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            averagePrice: { $avg: '$price' },
            totalViews: { $sum: '$views' }
          }
        }
      ]);

      // Get order statistics using the correct field structure
      const orderStats = await Order.aggregate([
        { $match: { 'sellers.seller': new mongoose.Types.ObjectId(sellerId) } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            confirmedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
            },
            processingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            },
            shippedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        }
      ]);

      // Get review statistics
      const reviewStats = await Review.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            fiveStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
            },
            fourStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
            },
            threeStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
            },
            twoStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
            },
            oneStarReviews: {
              $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
            }
          }
        }
      ]);

      console.log('✅ Direct database statistics calculated');
      console.log('\n📦 Product Stats (Direct):', productStats[0] || { totalProducts: 0 });
      console.log('📋 Order Stats (Direct):', orderStats[0] || { totalOrders: 0 });
      console.log('⭐ Review Stats (Direct):', reviewStats[0] || { totalReviews: 0 });

    } catch (error) {
      console.log('❌ Direct database statistics failed:', error.message);
    }

    // Test 3: Test OrderItem seller statistics
    console.log('\n=== Testing OrderItem Seller Statistics ===');
    
    try {
      const orderItemStats = await OrderItem.getSellerStats(sellerId);
      console.log('✅ OrderItem statistics calculated');
      console.log('📋 OrderItem Stats:', orderItemStats[0] || { totalItems: 0 });
    } catch (error) {
      console.log('❌ OrderItem statistics failed:', error.message);
    }

  } catch (error) {
    console.error('Error in seller statistics test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testSellerStatistics();