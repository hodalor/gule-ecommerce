const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB using the same connection string from the app
const MONGODB_URI = 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1';

async function testDirectUserCreation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Create a new user directly
    const testUser = new User({
      firstName: 'Direct',
      lastName: 'Test',
      email: 'directtest@example.com',
      password: 'Password123!',
      phone: '+260888888888',
      address: {
        street: '123 Direct St',
        city: 'Direct City',
        state: 'Direct State',
        zipCode: '12345',
        country: 'Zambia'
      }
    });

    console.log('Before save - password:', testUser.password);
    
    // Save the user
    const savedUser = await testUser.save();
    console.log('After save - password hash:', savedUser.password);
    
    // Test password comparison
    const isValid = await savedUser.comparePassword('Password123!');
    console.log('Password comparison result:', isValid);
    
    // Test with wrong password
    const isInvalid = await savedUser.comparePassword('WrongPassword');
    console.log('Wrong password comparison result:', isInvalid);
    
    // Clean up
    await User.deleteOne({ email: 'directtest@example.com' });
    console.log('Test user cleaned up');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

testDirectUserCreation();