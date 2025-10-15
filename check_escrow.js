const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Order = require('./models/Order');
const Escrow = require('./models/Escrow');
const User = require('./models/User');

async function checkEscrowTransactions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Get recent escrow transactions
        const escrows = await Escrow.find({})
            .populate('order', 'orderNumber totalAmount')
            .populate('buyer', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(5);
            
        console.log(`\nFound ${escrows.length} escrow transactions:`);
        
        escrows.forEach((escrow, index) => {
            console.log(`\n${index + 1}. Escrow Transaction:`);
            console.log(`   Escrow Number: ${escrow.escrowNumber}`);
            console.log(`   Order: ${escrow.order?.orderNumber || 'N/A'}`);
            console.log(`   Buyer: ${escrow.buyer?.firstName} ${escrow.buyer?.lastName} (${escrow.buyer?.email})`);
            console.log(`   Total Amount: ${escrow.totalAmount} ${escrow.currency}`);
            console.log(`   Status: ${escrow.status}`);
            console.log(`   Sellers: ${escrow.sellers.length}`);
            console.log(`   Auto Release Date: ${escrow.autoReleaseDate}`);
            console.log(`   Payment Method: ${escrow.paymentDetails?.paymentMethod}`);
            console.log(`   Transaction ID: ${escrow.paymentDetails?.transactionId}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkEscrowTransactions();