const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Seller = require('./models/Seller');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function fixSellerPasswords() {
  try {
    console.log('🔍 Checking and fixing seller passwords...\n');
    
    // Find all sellers
    const sellers = await Seller.find({}).select('+password');
    
    console.log(`Found ${sellers.length} sellers to check`);
    
    let fixedCount = 0;
    
    for (const seller of sellers) {
      console.log(`\n--- Checking Seller: ${seller.email} ---`);
      
      if (!seller.password) {
        console.log('❌ Password is undefined, generating new hash...');
        const hashedPassword = await bcrypt.hash('Password123!', 12);
        seller.password = hashedPassword;
        await seller.save();
        fixedCount++;
        console.log('✅ Password fixed');
        continue;
      }
      
      // Test if current password works with "Password123!"
      try {
        const isValid = await bcrypt.compare('Password123!', seller.password);
        
        if (isValid) {
          console.log('✅ Password is already correct');
        } else {
          console.log('❌ Password comparison failed, generating new hash...');
          const hashedPassword = await bcrypt.hash('Password123!', 12);
          seller.password = hashedPassword;
          await seller.save();
          fixedCount++;
          console.log('✅ Password fixed');
        }
      } catch (error) {
        console.log('❌ Error comparing password, generating new hash...');
        const hashedPassword = await bcrypt.hash('Password123!', 12);
        seller.password = hashedPassword;
        await seller.save();
        fixedCount++;
        console.log('✅ Password fixed');
      }
    }
    
    console.log(`\n🎉 Password fix complete! Fixed ${fixedCount} out of ${sellers.length} sellers.`);
    
  } catch (error) {
    console.error('❌ Error fixing seller passwords:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixSellerPasswords();