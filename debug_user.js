const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@ac-ajahtxn-shard-00-00.akz3eab.mongodb.net:27017,ac-ajahtxn-shard-00-01.akz3eab.mongodb.net:27017,ac-ajahtxn-shard-00-02.akz3eab.mongodb.net:27017/?authSource=admin&replicaSet=atlas-13kobb-shard-0&retryWrites=true&w=majority&appName=Lenderbase1&ssl=true', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testUserPasswordHashing() {
  try {
    console.log('Testing User model password hashing...');
    
    // Create a test user
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@debug.com',
      password: 'Password123!',
      phone: '+260999999999',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      }
    });
    
    console.log('Before save - password:', testUser.password);
    
    // Save the user (this should trigger the pre-save middleware)
    await testUser.save();
    
    console.log('After save - password hash:', testUser.password);
    
    // Test password comparison
    const isValid = await testUser.comparePassword('Password123!');
    console.log('Password comparison result:', isValid);
    
    // Clean up
    await User.deleteOne({ email: 'testuser@debug.com' });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

testUserPasswordHashing();