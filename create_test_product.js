const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Connect to MongoDB using the same connection string as the backend
mongoose.connect(process.env.MONGODB_URI);

async function createTestProduct() {
  try {
    // Use the verified seller ID
    const sellerId = '68ed7a4b9e60579ff9b6bc00';
    
    const productData = {
      name: 'Test Electronics Product',
      description: 'A high-quality test product for debugging and testing purposes',
      price: 29.99,
      category: 'Electronics',
      subcategory: 'Gadgets',
      brand: 'TestBrand',
      weight: {
        value: 0.5,
        unit: 'kg'
      },
      dimensions: {
        length: 10,
        width: 5,
        height: 3,
        unit: 'cm'
      },
      stock: 100,
      images: [
        {
          url: 'https://example.com/image1.jpg',
          alt: 'Test Product Image',
          isPrimary: true
        }
      ],
      specifications: [
        {
          name: 'color',
          value: 'Black'
        },
        {
          name: 'material',
          value: 'Plastic'
        },
        {
          name: 'warranty',
          value: '1 year'
        }
      ],
      seller: sellerId,
      status: 'active',
      isActive: true
    };
    
    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log('Test product created successfully!');
    console.log('Product ID:', savedProduct._id);
    console.log('Product Name:', savedProduct.name);
    console.log('Price:', savedProduct.price);
    console.log('Seller ID:', savedProduct.seller);
    console.log('Status:', savedProduct.status);
    
  } catch (error) {
    console.error('Error creating test product:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestProduct();