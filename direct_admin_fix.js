require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define Admin schema directly to avoid model conflicts
const adminSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['super_admin', 'admin', 'accountant', 'review_officer', 'customer_support', 'marketing_manager'] },
  department: { type: String },
  isActive: { type: Boolean, default: true },
  accountStatus: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' }
}, { timestamps: true });

// Add comparePassword method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

async function directAdminFix() {
  try {
    // Use the same connection string as the server
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB Atlas');

    // Create or get the Admin model
    const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

    // Find the existing admin user
    const existingAdmin = await Admin.findOne({ email: 'superadmin@gule.com' }).select('+password');
    
    if (existingAdmin) {
      console.log('👤 Found existing admin user');
      console.log('- Current password hash:', existingAdmin.password);
      
      // Generate new password hash manually
      const newPassword = 'admin123';
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      console.log('🔐 Generated new password hash:', hashedPassword);
      
      // Update the password directly
      await Admin.updateOne(
        { email: 'superadmin@gule.com' },
        { 
          $set: { 
            password: hashedPassword,
            accountStatus: 'active'
          }
        }
      );
      
      console.log('✅ Password updated successfully');
      
      // Verify the update
      const updatedAdmin = await Admin.findOne({ email: 'superadmin@gule.com' }).select('+password');
      const isMatch = await bcrypt.compare(newPassword, updatedAdmin.password);
      console.log('🔍 Password verification:', isMatch ? '✅ Success' : '❌ Failed');
      
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

directAdminFix();