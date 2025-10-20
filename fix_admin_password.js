require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Admin } = require('./models');

async function fixAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://princehodalor:cLjVfT.2bHeZT_H@lenderbase1.akz3eab.mongodb.net/?retryWrites=true&w=majority&appName=Lenderbase1');
    console.log('✅ Connected to MongoDB Atlas');

    // Delete existing admin user
    const deleteResult = await Admin.deleteOne({ email: 'admin@gule.com' });
    console.log('🗑️ Deleted existing admin user:', deleteResult.deletedCount > 0 ? 'Success' : 'Not found');

    // Create new admin user with proper password hashing
    const adminData = {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@gule.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      role: 'super_admin',
      department: 'IT',
      isActive: true,
      accountStatus: 'active'
    };

    console.log('🔐 Creating new admin user...');
    const admin = new Admin(adminData);
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('- ID:', admin._id);
    console.log('- Email:', admin.email);
    console.log('- Employee ID:', admin.employeeId);
    console.log('- Role:', admin.role);
    console.log('- Account Status:', admin.accountStatus);

    // Test password comparison immediately after creation
    const testPassword = 'admin123';
    const isMatch = await admin.comparePassword(testPassword);
    console.log('🔍 Password comparison test:', isMatch ? '✅ Match' : '❌ No match');

    if (isMatch) {
      console.log('🎉 Admin user is ready for login!');
    } else {
      console.log('❌ Password comparison still failing');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('Duplicate key error - admin user might already exist');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixAdminPassword();