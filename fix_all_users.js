const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1';

async function fixAllUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find all users with password field
    const users = await User.find({}).select('+password');
    
    console.log(`Found ${users.length} users to check`);
    
    let fixedCount = 0;
    
    for (const user of users) {
      console.log(`\nChecking user: ${user.email}`);
      
      // Test if current password works with "Password123!"
      try {
        const isValid = await bcrypt.compare('Password123!', user.password);
        
        if (!isValid) {
          console.log(`  Password invalid for ${user.email}, fixing...`);
          
          // Generate new hash for Password123!
          const newHash = await bcrypt.hash('Password123!', 12);
          
          // Update user directly in database
          await User.updateOne(
            { _id: user._id },
            { $set: { password: newHash } }
          );
          
          console.log(`  ✓ Fixed password for ${user.email}`);
          fixedCount++;
        } else {
          console.log(`  ✓ Password already correct for ${user.email}`);
        }
      } catch (error) {
        console.log(`  ✗ Error checking ${user.email}:`, error.message);
      }
    }
    
    console.log(`\nFixed ${fixedCount} users out of ${users.length} total users`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

fixAllUsers();