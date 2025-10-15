const mongoose = require('mongoose');
const Seller = require('./models/Seller');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function checkSellers() {
  try {
    // Find all sellers
    const sellers = await Seller.find({}).select('+password').limit(10);
    
    console.log(`Found ${sellers.length} sellers:`);
    
    sellers.forEach((seller, index) => {
      console.log(`\n--- Seller ${index + 1} ---`);
      console.log('ID:', seller._id);
      console.log('Email:', seller.email);
      console.log('First Name:', seller.firstName);
      console.log('Last Name:', seller.lastName);
      console.log('Business Name:', seller.businessName);
      console.log('Status:', seller.status);
      console.log('Verification Status:', seller.verificationStatus);
      console.log('Is Active:', seller.isActive);
      console.log('Password Hash Length:', seller.password ? seller.password.length : 'undefined');
    });
    
  } catch (error) {
    console.error('Error finding sellers:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkSellers();