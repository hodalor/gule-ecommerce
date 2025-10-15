const mongoose = require('mongoose');
require('dotenv').config();

// Load models
require('./models/Product');
require('./models/Seller');

const Product = mongoose.model('Product');

async function debugOrderCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find a product
    const product = await Product.findById('68ee979261dec9616722ea46').populate('seller');
    console.log('Product found:', !!product);
    console.log('Product name:', product?.name);
    console.log('Product seller:', product?.seller);
    console.log('Product seller type:', typeof product?.seller);
    console.log('Product seller _id:', product?.seller?._id);
    console.log('Product images:', product?.images);
    console.log('Product images length:', product?.images?.length);
    console.log('First image:', product?.images?.[0]);
    
    // Test the exact line that's failing
    const orderItem = {
      product: product._id,
      seller: product.seller?._id || product.seller || null,
      quantity: 1,
      price: product.price,
      total: product.price * 1,
      productName: product.name,
      productImage: product.images && product.images[0] ? product.images[0].url : null
    };
    
    console.log('Order item created successfully:', orderItem);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

debugOrderCreation();
