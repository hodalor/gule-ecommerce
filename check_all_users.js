const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1';

async function checkAllUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({}).select('email password firstName lastName');
    
    console.log(`Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log('Email:', user.email);
      console.log('First Name:', user.firstName);
      console.log('Last Name:', user.lastName);
      console.log('Password field exists:', user.password !== undefined);
      console.log('Password value:', user.password);
      if (user.password) {
        console.log('Password length:', user.password.length);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

checkAllUsers();