require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const { Order, OrderItem, User, Seller, Product, Review } = require('./models');

async function cleanupAndCreateMockData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\n=== Cleaning up test data ===');

    // Remove test orders
    const deletedOrders = await Order.deleteMany({
      orderNumber: { $regex: /^ORD-.*-VC639$/ }
    });
    console.log(`✅ Deleted ${deletedOrders.deletedCount} test orders`);

    // Remove test order items
    const deletedOrderItems = await OrderItem.deleteMany({
      'productSnapshot.name': 'Test Product'
    });
    console.log(`✅ Deleted ${deletedOrderItems.deletedCount} test order items`);

    // Remove test products
    const deletedProducts = await Product.deleteMany({
      name: 'Test Product'
    });
    console.log(`✅ Deleted ${deletedProducts.deletedCount} test products`);

    // Remove test users (buyers)
    const deletedUsers = await User.deleteMany({
      firstName: 'Test',
      lastName: 'Buyer'
    });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} test users`);

    console.log('\n=== Creating mock data for frontend display ===');

    // Create mock sellers (if they don't exist)
    const mockSellers = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.seller@example.com',
        password: 'hashedpassword123',
        businessName: 'Smith Electronics',
        businessType: 'company',
        phone: '+260971234567',
        businessAddress: {
          street: '123 Main Street',
          city: 'Lusaka',
          state: 'Lusaka Province',
          zipCode: '10101',
          country: 'Zambia'
        },
        isVerified: true,
        verificationStatus: 'verified',
        isActive: true,
        rating: 4.5,
        totalSales: 15000,
        commission: 5
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.seller@example.com',
        password: 'hashedpassword456',
        businessName: 'Johnson Fashion',
        businessType: 'individual',
        phone: '+260977654321',
        businessAddress: {
          street: '456 Fashion Avenue',
          city: 'Ndola',
          state: 'Copperbelt Province',
          zipCode: '20202',
          country: 'Zambia'
        },
        isVerified: true,
        verificationStatus: 'verified',
        isActive: true,
        rating: 4.8,
        totalSales: 25000,
        commission: 4
      }
    ];

    const createdSellers = [];
    for (const sellerData of mockSellers) {
      const existingSeller = await Seller.findOne({ email: sellerData.email });
      if (!existingSeller) {
        const seller = new Seller(sellerData);
        await seller.save();
        createdSellers.push(seller);
        console.log(`✅ Created mock seller: ${seller.businessName}`);
      } else {
        createdSellers.push(existingSeller);
        console.log(`ℹ️  Mock seller already exists: ${existingSeller.businessName}`);
      }
    }

    // Create mock buyers
    const mockBuyers = [
      {
        firstName: 'Alice',
        lastName: 'Wilson',
        email: 'alice.wilson@example.com',
        password: 'password123', // Use plain text password, let the model hash it
        phone: '+260971111111',
        address: {
          street: '789 Buyer Lane',
          city: 'Lusaka',
          state: 'Lusaka Province',
          zipCode: '10101',
          country: 'Zambia'
        },
        isActive: true,
        isVerified: true
      },
      {
        firstName: 'Bob',
        lastName: 'Davis',
        email: 'bob.davis@example.com',
        password: 'password123', // Use plain text password, let the model hash it
        phone: '+260972222222',
        address: {
          street: '321 Customer Rd',
          city: 'Ndola',
          state: 'Copperbelt Province',
          zipCode: '20202',
          country: 'Zambia'
        },
        isActive: true,
        isVerified: true
      }
    ];

    const createdBuyers = [];
    for (const buyerData of mockBuyers) {
      let buyer = await User.findOne({ email: buyerData.email });
      if (!buyer) {
        buyer = new User(buyerData);
        await buyer.save();
        createdBuyers.push(buyer);
        console.log(`✅ Created mock buyer: ${buyer.firstName} ${buyer.lastName}`);
      } else {
        // Update existing buyer with complete address information and password
        buyer.address = buyerData.address;
        buyer.phone = buyerData.phone;
        buyer.password = buyerData.password; // Use plain text password, let the model hash it
        await buyer.save();
        createdBuyers.push(buyer);
        console.log(`ℹ️  Updated mock buyer: ${buyer.firstName} ${buyer.lastName}`);
      }
    }

    // Create mock products
    const mockProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'Premium quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 149.99,
        category: 'Electronics',
        subcategory: 'Audio',
        seller: createdSellers[0]._id,
        stock: 50,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
            alt: 'Wireless Bluetooth Headphones',
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
            alt: 'Headphones Side View',
            isPrimary: false
          }
        ],
        specifications: [
          { name: 'Brand', value: 'AudioTech' },
          { name: 'Model', value: 'AT-WH1000' },
          { name: 'Color', value: 'Black' },
          { name: 'Weight', value: '250g' },
          { name: 'Battery Life', value: '30 hours' },
          { name: 'Connectivity', value: 'Bluetooth 5.0' }
        ],
        status: 'active'
      },
      {
        name: 'Smart Fitness Watch',
        description: 'Advanced fitness tracking watch with heart rate monitor, GPS, and smartphone integration.',
        price: 299.99,
        category: 'Electronics',
        subcategory: 'Wearables',
        seller: createdSellers[0]._id,
        stock: 30,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            alt: 'Smart Fitness Watch',
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500',
            alt: 'Fitness Watch Display',
            isPrimary: false
          }
        ],
        specifications: [
          { name: 'Brand', value: 'FitTech' },
          { name: 'Model', value: 'FT-SW200' },
          { name: 'Color', value: 'Silver' },
          { name: 'Display Size', value: '1.4 inch' },
          { name: 'Battery Life', value: '7 days' },
          { name: 'Water Resistance', value: '5ATM' }
        ],
        status: 'active'
      },
      {
        name: 'Designer Handbag',
        description: 'Elegant leather handbag perfect for both casual and formal occasions.',
        price: 199.99,
        category: 'Fashion',
        subcategory: 'Bags',
        seller: createdSellers[1]._id,
        stock: 25,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
            alt: 'Designer Handbag',
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500',
            alt: 'Handbag Detail View',
            isPrimary: false
          }
        ],
        specifications: [
          { name: 'Brand', value: 'LuxeBags' },
          { name: 'Material', value: 'Genuine Leather' },
          { name: 'Color', value: 'Brown' },
          { name: 'Dimensions', value: '30x25x15 cm' },
          { name: 'Closure', value: 'Magnetic snap' }
        ],
        status: 'active'
      }
    ];

    const createdProducts = [];
    for (const productData of mockProducts) {
      const existingProduct = await Product.findOne({ 
        name: productData.name,
        seller: productData.seller 
      });
      if (!existingProduct) {
        const product = new Product(productData);
        await product.save();
        createdProducts.push(product);
        console.log(`✅ Created mock product: ${product.name}`);
      } else {
        createdProducts.push(existingProduct);
        console.log(`ℹ️  Mock product already exists: ${existingProduct.name}`);
      }
    }

    // Create mock orders
    const mockOrders = [
      {
        orderNumber: `ORD-${Date.now()}-MOCK1`,
        buyer: createdBuyers[0]._id,
        buyerRef: createdBuyers[0]._id,
        items: [],
        sellers: [{
          seller: createdSellers[0]._id,
          items: [],
          subtotal: 149.99,
          commission: 7.5,
          status: 'delivered'
        }],
        subtotal: 149.99,
        totalAmount: 159.98,
        shippingAddress: {
          firstName: createdBuyers[0].firstName,
          lastName: createdBuyers[0].lastName,
          phone: createdBuyers[0].phone,
          email: createdBuyers[0].email,
          street: createdBuyers[0].address.street,
          city: createdBuyers[0].address.city,
          state: createdBuyers[0].address.state,
          zipCode: createdBuyers[0].address.zipCode,
          country: createdBuyers[0].address.country
        },
        billingAddress: {
          firstName: createdBuyers[0].firstName,
          lastName: createdBuyers[0].lastName,
          phone: createdBuyers[0].phone,
          email: createdBuyers[0].email,
          street: createdBuyers[0].address.street,
          city: createdBuyers[0].address.city,
          state: createdBuyers[0].address.state,
          zipCode: createdBuyers[0].address.zipCode,
          country: createdBuyers[0].address.country
        },
        paymentMethod: 'card',
        paymentStatus: 'paid',
        status: 'delivered',
        shippingMethod: 'standard',
        shippingCost: 9.99,
        taxAmount: 0,
        discountAmount: 0,
        deliveredAt: new Date('2024-03-15'),
        createdAt: new Date('2024-03-10')
      },
      {
        orderNumber: `ORD-${Date.now() + 1000}-MOCK2`,
        buyer: createdBuyers[1]._id,
        buyerRef: createdBuyers[1]._id,
        items: [],
        sellers: [{
          seller: createdSellers[1]._id,
          items: [],
          subtotal: 199.99,
          commission: 10.00,
          status: 'shipped'
        }],
        subtotal: 199.99,
        totalAmount: 214.98,
        shippingAddress: {
          firstName: createdBuyers[1].firstName,
          lastName: createdBuyers[1].lastName,
          phone: createdBuyers[1].phone,
          email: createdBuyers[1].email,
          street: createdBuyers[1].address.street,
          city: createdBuyers[1].address.city,
          state: createdBuyers[1].address.state,
          zipCode: createdBuyers[1].address.zipCode,
          country: createdBuyers[1].address.country
        },
        billingAddress: {
          firstName: createdBuyers[1].firstName,
          lastName: createdBuyers[1].lastName,
          phone: createdBuyers[1].phone,
          email: createdBuyers[1].email,
          street: createdBuyers[1].address.street,
          city: createdBuyers[1].address.city,
          state: createdBuyers[1].address.state,
          zipCode: createdBuyers[1].address.zipCode,
          country: createdBuyers[1].address.country
        },
        paymentMethod: 'mobile_money',
        paymentStatus: 'paid',
        status: 'shipped',
        shippingMethod: 'express',
        shippingCost: 14.99,
        taxAmount: 0,
        discountAmount: 0,
        shippedAt: new Date('2024-04-08'),
        createdAt: new Date('2024-04-05')
      }
    ];

    // Create order items for the orders
    const orderItems = [
      {
        order: null, // Will be set after order creation
        product: createdProducts[0]._id,
        seller: createdSellers[0]._id,
        quantity: 1,
        unitPrice: 149.99,
        totalPrice: 149.99,
        productSnapshot: {
          name: createdProducts[0].name,
          description: createdProducts[0].description,
          image: createdProducts[0].images[0].url,
          category: createdProducts[0].category
        },
        pricing: {
          basePrice: 149.99,
          variantPrice: 0,
          customizationPrice: 0,
          discountAmount: 0,
          taxAmount: 0
        },
        commission: {
          rate: 0.05,
          amount: 7.50
        },
        status: 'delivered'
      },
      {
        order: null, // Will be set after order creation
        product: createdProducts[2]._id,
        seller: createdSellers[1]._id,
        quantity: 1,
        unitPrice: 199.99,
        totalPrice: 199.99,
        productSnapshot: {
          name: createdProducts[2].name,
          description: createdProducts[2].description,
          image: createdProducts[2].images[0].url,
          category: createdProducts[2].category
        },
        pricing: {
          basePrice: 199.99,
          variantPrice: 0,
          customizationPrice: 0,
          discountAmount: 0,
          taxAmount: 0
        },
        commission: {
          rate: 0.05,
          amount: 10.00
        },
        status: 'shipped'
      }
    ];

    // Create orders and order items
    for (let i = 0; i < mockOrders.length; i++) {
      const orderData = mockOrders[i];
      const existingOrder = await Order.findOne({ orderNumber: orderData.orderNumber });
      
      if (!existingOrder) {
        const order = new Order(orderData);
        await order.save();
        
        // Create order item
        const orderItemData = orderItems[i];
        orderItemData.order = order._id;
        const orderItem = new OrderItem(orderItemData);
        await orderItem.save();
        
        // Update order with item reference
        order.items = [orderItem._id];
        order.sellers[0].items = [orderItem._id];
        await order.save();
        
        console.log(`✅ Created mock order: ${order.orderNumber}`);
      } else {
        console.log(`ℹ️  Mock order already exists: ${existingOrder.orderNumber}`);
      }
    }

    console.log('\n=== Mock data creation completed ===');
    console.log(`📊 Summary:`);
    console.log(`   - Sellers: ${createdSellers.length}`);
    console.log(`   - Buyers: ${createdBuyers.length}`);
    console.log(`   - Products: ${createdProducts.length}`);
    console.log(`   - Orders: ${mockOrders.length}`);

  } catch (error) {
    console.error('Error in cleanup and mock data creation:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanupAndCreateMockData();