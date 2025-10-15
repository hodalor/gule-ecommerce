const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Seller = require('./models/Seller');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function debugSellerHash() {
  try {
    console.log('🔍 Debugging seller password hashing...\n');
    
    const email = 'john.seller@example.com';
    const password = 'Password123!';
    
    // Find the seller
    const seller = await Seller.findOne({ email }).select('+password');
    
    if (!seller) {
      console.log('❌ Seller not found');
      return;
    }
    
    console.log('Current password hash:', seller.password);
    console.log('Hash starts with $2b$12$:', seller.password.startsWith('$2b$12$'));
    
    // Test if the current hash is actually a hash of "Password123!"
    console.log('\n--- Testing current hash ---');
    const currentTest = await bcrypt.compare(password, seller.password);
    console.log('Current hash matches "Password123!":', currentTest);
    
    // Generate a fresh hash manually (without using the model)
    console.log('\n--- Generating fresh hash manually ---');
    const freshHash = await bcrypt.hash(password, 12);
    console.log('Fresh hash:', freshHash);
    
    const freshTest = await bcrypt.compare(password, freshHash);
    console.log('Fresh hash matches "Password123!":', freshTest);
    
    // Update the seller with the fresh hash directly (bypassing pre-save middleware)
    console.log('\n--- Updating with fresh hash (bypassing middleware) ---');
    await Seller.updateOne(
      { email },
      { $set: { password: freshHash } }
    );
    
    // Test again
    const updatedSeller = await Seller.findOne({ email }).select('+password');
    const finalTest = await updatedSeller.comparePassword(password);
    console.log('Updated seller password test:', finalTest);
    
    if (finalTest) {
      console.log('\n✅ Seller password fixed!');
    } else {
      console.log('\n❌ Still having issues');
    }
    
  } catch (error) {
    console.error('❌ Error debugging seller hash:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugSellerHash();