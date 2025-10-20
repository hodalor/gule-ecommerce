const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the Admin model
const Admin = require('./models/Admin');
const connectDB = async () => {
  try {
    // Use MongoDB Atlas connection from environment variable
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('🔗 Connecting to MongoDB Atlas...');
    
    const connectionStrings = [mongoUri];

    for (const connectionString of connectionStrings) {
      try {
        console.log(`Trying to connect to: ${connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        
        await mongoose.connect(connectionString, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
        });
        
        console.log('✅ Connected to MongoDB Atlas successfully!');
        return;
      } catch (error) {
        console.log(`❌ Failed to connect to MongoDB Atlas: ${error.message}`);
      }
    }
    
    throw new Error('Could not connect to any MongoDB instance');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@gule.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      console.log('Admin details:');
      console.log('- Name:', existingAdmin.firstName, existingAdmin.lastName);
      console.log('- Email:', existingAdmin.email);
      console.log('- Role:', existingAdmin.role);
      console.log('- Status:', existingAdmin.status);
      console.log('- Employee ID:', existingAdmin.employeeId);
      
      // Test password
      const testPassword = 'admin123';
      const isPasswordValid = await existingAdmin.comparePassword(testPassword);
      console.log(`- Password test (${testPassword}):`, isPasswordValid ? '✅ Valid' : '❌ Invalid');
      
      mongoose.disconnect();
      return;
    }

    // Create new admin user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    // Create admin user with all required fields
    const adminData = {
      employeeId: 'ADMIN001',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@gule.com',
      password: hashedPassword,
      role: 'super_admin',
      department: 'administration',
      jobTitle: 'System Administrator',
      phone: '+260123456789',
      address: {
        street: '123 Admin Street',
        city: 'Lusaka',
        state: 'Lusaka Province',
        zipCode: '10101',
        country: 'Zambia'
      },
      employment: {
        hireDate: new Date(),
        salary: 50000,
        currency: 'ZMW',
        contractType: 'full_time'
      },
      permissions: [
        {
          module: 'users',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          module: 'sellers',
          actions: ['create', 'read', 'update', 'delete', 'approve', 'reject']
        },
        {
          module: 'products',
          actions: ['create', 'read', 'update', 'delete', 'approve', 'reject']
        },
        {
          module: 'orders',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          module: 'escrow',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          module: 'reviews',
          actions: ['create', 'read', 'update', 'delete', 'approve', 'reject']
        },
        {
          module: 'settings',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          module: 'reports',
          actions: ['read']
        },
        {
          module: 'audit_logs',
          actions: ['read']
        },
        {
          module: 'admins',
          actions: ['create', 'read', 'update', 'delete']
        }
      ],
      isActive: true
    };

    const adminUser = new Admin(adminData)

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('Login credentials:');
    console.log('- Email: admin@gule.com');
    console.log('- Password: admin123');
    console.log('- Role: super_admin');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.log('Admin user might already exist with this email or phone');
    }
  } finally {
    mongoose.disconnect();
  }
};

createAdminUser();