const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Seller = require('./models/Seller');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function fixAllSellerPasswords() {
  try {
    console.log('🔍 Fixing all seller passwords...\n');
    
    // Find all sellers
    const sellers = await Seller.find({}).select('+password');
    
    console.log(`Found ${sellers.length} sellers to fix`);
    
    let fixedCount = 0;
    
    for (const seller of sellers) {
      console.log(`\n--- Fixing Seller: ${seller.email} ---`);
      
      // Generate a fresh hash manually (without using the model save method)
      const freshHash = await bcrypt.hash('Password123!', 12);
      
      // Update directly in the database to bypass pre-save middleware
      await Seller.updateOne(
        { _id: seller._id },
        { $set: { password: freshHash } }
      );
      
      // Verify the fix
      const updatedSeller = await Seller.findById(seller._id).select('+password');
      const isValid = await updatedSeller.comparePassword('Password123!');
      
      if (isValid) {
        console.log('✅ Password fixed successfully');
        fixedCount++;
      } else {
        console.log('❌ Password fix failed');
      }
    }
    
    console.log(`\n🎉 Password fix complete! Fixed ${fixedCount} out of ${sellers.length} sellers.`);
    
  } catch (error) {
    console.error('❌ Error fixing seller passwords:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixAllSellerPasswords();