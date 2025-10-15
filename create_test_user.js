const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./models/User');

async function createTestUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if user already exists
        const existingUser = await User.findOne({ email: 'testuser@example.com' });
        if (existingUser) {
            console.log('Test user already exists');
            await mongoose.connection.close();
            return;
        }

        const testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'testuser@example.com',
            password: 'password123', // Let the model hash this
            userType: 'buyer',
            isEmailVerified: true,
            isActive: true
        });

        await testUser.save();
        console.log('✅ Test user created successfully!');
        console.log('Email: testuser@example.com');
        console.log('Password: password123');
        console.log('UserType: buyer');

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
}

createTestUser();