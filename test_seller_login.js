const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Seller = require('./models/Seller');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function testSellerLogin() {
  try {
    console.log('🔍 Testing seller login functionality...\n');
    
    const email = 'john.seller@example.com';
    const password = 'Password123!';
    
    // Find the seller
    const seller = await Seller.findOne({ email }).select('+password');
    
    if (!seller) {
      console.log('❌ Seller not found');
      return;
    }
    
    console.log('✅ Seller found:', seller.email);
    console.log('Password exists:', !!seller.password);
    console.log('Password length:', seller.password ? seller.password.length : 'N/A');
    
    // Test password comparison using the model method
    console.log('\n--- Testing comparePassword method ---');
    const isValid = await seller.comparePassword(password);
    console.log('comparePassword result:', isValid);
    
    // Test direct bcrypt comparison
    console.log('\n--- Testing direct bcrypt comparison ---');
    const directComparison = await bcrypt.compare(password, seller.password);
    console.log('Direct bcrypt result:', directComparison);
    
    // Test with wrong password
    console.log('\n--- Testing with wrong password ---');
    const wrongPassword = await seller.comparePassword('wrongpassword');
    console.log('Wrong password result:', wrongPassword);
    
    if (isValid) {
      console.log('\n✅ Seller login should work!');
    } else {
      console.log('\n❌ Seller login will fail - password issue detected');
    }
    
  } catch (error) {
    console.error('❌ Error testing seller login:', error);
  } finally {
    mongoose.connection.close();
  }
}

testSellerLogin();