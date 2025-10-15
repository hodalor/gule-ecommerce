const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User'); // Import User model for Seller reference
const Seller = require('./models/Seller'); // Import Seller model

async function debugProductLookup() {
  try {
    // Connect to MongoDB using the same URI as the app
    await mongoose.connect('mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1');
    console.log('Connected to MongoDB');

    // Find the first product
    const product = await Product.findOne().populate('seller');
    console.log('Product found:', !!product);
    console.log('Product ID:', product?._id);
    console.log('Product name:', product?.name);
    console.log('Product seller:', product?.seller);
    console.log('Product seller type:', typeof product?.seller);
    console.log('Product seller _id:', product?.seller?._id);
    
    // Test the exact line that's failing
    console.log('\nTesting the problematic line:');
    const productId = product?._id || null;
    console.log('product?._id || null result:', productId);
    
    // Test if product is null
    console.log('\nTesting null product:');
    const nullProduct = null;
    const nullProductId = nullProduct?._id || null;
    console.log('nullProduct?._id || null result:', nullProductId);
    
    // Test the items array processing
    console.log('\nTesting items array processing:');
    const items = [{ product: product._id, quantity: 1, unitPrice: product.price }];
    
    for (const item of items) {
      console.log('Processing item:', item);
      const foundProduct = await Product.findById(item.product).populate('seller');
      console.log('Found product:', !!foundProduct);
      console.log('Found product ID:', foundProduct?._id);
      console.log('Found product name:', foundProduct?.name);
      console.log('Found product seller:', foundProduct?.seller);
      
      // Test the exact orderItems.push logic
      const orderItem = {
        product: foundProduct?._id || null,
        seller: foundProduct?.seller?._id || foundProduct?.seller || null,
        quantity: item.quantity,
        price: foundProduct?.price || 0,
        total: (foundProduct?.price || 0) * item.quantity,
        productName: foundProduct?.name || 'Unknown Product',
        productImage: foundProduct?.images && foundProduct.images[0] ? foundProduct.images[0].url : null
      };
      console.log('Order item created successfully:', orderItem);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugProductLookup();