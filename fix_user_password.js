const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1';

async function fixUserPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find the problematic user with password field explicitly selected
    const user = await User.findOne({ email: 'finaltest@example.com' }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:');
    console.log('Email:', user.email);
    console.log('Current password hash:', user.password);
    
    // Test current password comparison
    const currentComparison = await bcrypt.compare('Password123!', user.password);
    console.log('Current password comparison result:', currentComparison);
    
    // Generate a new hash for the correct password
    console.log('Generating new hash for Password123!...');
    const newHash = await bcrypt.hash('Password123!', 12);
    console.log('New hash:', newHash);
    
    // Test the new hash
    const newHashComparison = await bcrypt.compare('Password123!', newHash);
    console.log('New hash comparison result:', newHashComparison);
    
    // Update the user with the correct hash directly in the database
    console.log('Updating user password in database...');
    await User.updateOne(
      { email: 'finaltest@example.com' },
      { $set: { password: newHash } }
    );
    
    console.log('User password updated successfully');
    
    // Verify the update
    const updatedUser = await User.findOne({ email: 'finaltest@example.com' }).select('+password');
    console.log('Updated password hash:', updatedUser.password);
    
    // Test login after update
    const finalTest = await bcrypt.compare('Password123!', updatedUser.password);
    console.log('Final password comparison result:', finalTest);
    
    // Test using the model's comparePassword method
    const modelTest = await updatedUser.comparePassword('Password123!');
    console.log('Model comparePassword result:', modelTest);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

fixUserPassword();