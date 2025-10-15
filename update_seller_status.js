const mongoose = require('mongoose');
const Seller = require('./models/Seller');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateSellerStatus() {
  try {
    // Find the seller by ID (using the seller ID from previous tests)
    const sellerId = '676b7b5b8b123456789abcde'; // Replace with actual seller ID
    
    const seller = await Seller.findById(sellerId);
    
    if (!seller) {
      console.log('Seller not found');
      return;
    }
    
    console.log('Current seller status:', seller.status);
    console.log('Current verification status:', seller.verificationStatus);
    console.log('Current isActive:', seller.isActive);
    console.log('Current isVerified:', seller.isVerified);
    
    // Update seller status
    const updatedSeller = await Seller.findByIdAndUpdate(
      sellerId,
      {
        status: 'active',
        verificationStatus: 'verified',
        isActive: true,
        isVerified: true
      },
      { new: true }
    );
    
    console.log('Seller updated successfully!');
    console.log('New status:', updatedSeller.status);
    console.log('New verification status:', updatedSeller.verificationStatus);
    console.log('New isActive:', updatedSeller.isActive);
    console.log('New isVerified:', updatedSeller.isVerified);
    
  } catch (error) {
    console.error('Error updating seller:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateSellerStatus();