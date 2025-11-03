require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function resetAdminPassword() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in environment variables');

    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    const email = 'admin@gule.com';
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('❌ Admin not found:', email);
      return;
    }

    console.log('🧩 Found admin:', admin.email, '| EmployeeID:', admin.employeeId);

    // Set plain password so pre-save hook hashes it
    const newPassword = 'admin123';
    admin.set('password', newPassword);

    await admin.save();
    console.log('✅ Password reset using model pre-save hashing');

    // Verify by fetching fresh and running compare
    const fresh = await Admin.findOne({ email }).select('+password');
    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare(newPassword, fresh.password);
    console.log('🔍 Password compare test:', match ? '✅ Match' : '❌ No match');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetAdminPassword();