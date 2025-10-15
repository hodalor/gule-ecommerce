const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1';

async function checkExistingUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find the problematic user
    const user = await User.findOne({ email: 'finaltest@example.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:');
    console.log('Email:', user.email);
    console.log('Current password hash:', user.password);
    console.log('Hash length:', user.password.length);
    
    // Test current password comparison
    const currentComparison = await user.comparePassword('Password123!');
    console.log('Current password comparison result:', currentComparison);
    
    // Test with bcrypt directly
    const directComparison = await bcrypt.compare('Password123!', user.password);
    console.log('Direct bcrypt comparison result:', directComparison);
    
    // Generate a new hash for the correct password
    const newHash = await bcrypt.hash('Password123!', 12);
    console.log('New hash for Password123!:', newHash);
    
    // Test the new hash
    const newHashComparison = await bcrypt.compare('Password123!', newHash);
    console.log('New hash comparison result:', newHashComparison);
    
    // Update the user with the correct hash
    console.log('Updating user with correct password hash...');
    user.password = newHash;
    await user.save({ validateBeforeSave: false }); // Skip validation to avoid re-hashing
    
    console.log('User password updated successfully');
    
    // Test login after update
    const updatedUser = await User.findOne({ email: 'finaltest@example.com' });
    const finalTest = await updatedUser.comparePassword('Password123!');
    console.log('Final password comparison result:', finalTest);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

checkExistingUser();