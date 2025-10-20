const mongoose = require('mongoose');
const { Admin } = require('./models');

async function checkAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1');
    console.log('✅ Connected to MongoDB Atlas');

    // Find the admin user
    const admin = await Admin.findOne({ email: 'admin@gule.com' }).select('+password');
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('- ID:', admin._id);
      console.log('- Email:', admin.email);
      console.log('- Role:', admin.role);
      console.log('- Account Status:', admin.accountStatus);
      console.log('- Password Hash:', admin.password ? 'Present' : 'Missing');
      console.log('- Password Hash Length:', admin.password ? admin.password.length : 'N/A');
      console.log('- Created At:', admin.createdAt);
      
      // Test password comparison
      if (admin.password) {
        const testPassword = 'admin123';
        const isMatch = await admin.comparePassword(testPassword);
        console.log('- Password comparison test:', isMatch ? '✅ Match' : '❌ No match');
      }
    } else {
      console.log('❌ Admin user not found');
    }

    // List all admin users
    const allAdmins = await Admin.find({});
    console.log('\n📋 All admin users in database:', allAdmins.length);
    allAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email} - ${admin.role} - ${admin.accountStatus}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAdminUser();