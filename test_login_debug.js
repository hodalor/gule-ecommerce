const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./models/User');

async function testLogin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'testuser@example.com';
        const password = 'password123';

        // Find user
        const user = await User.findOne({ email }).select('+password');
        console.log('User found:', !!user);
        
        if (user) {
            console.log('User ID:', user._id);
            console.log('User email:', user.email);
            console.log('User password exists:', !!user.password);
            console.log('User password length:', user.password ? user.password.length : 'N/A');
            console.log('User password hash:', user.password);
            
            // Test password comparison
            console.log('\n--- Testing password comparison ---');
            console.log('Provided password:', password);
            
            // Direct bcrypt comparison
            const directComparison = await bcrypt.compare(password, user.password);
            console.log('Direct bcrypt.compare result:', directComparison);
            
            // Using model method
            const modelComparison = await user.comparePassword(password);
            console.log('Model comparePassword result:', modelComparison);
            
            // Test with wrong password
            const wrongPassword = 'wrongpassword';
            const wrongComparison = await user.comparePassword(wrongPassword);
            console.log('Wrong password comparison:', wrongComparison);
        } else {
            console.log('User not found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
}

testLogin();