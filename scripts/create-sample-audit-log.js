require('dotenv').config();
const mongoose = require('mongoose');
const { Admin } = require('../models');
const AuditLog = require('../models/AuditLog');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await Admin.findOne({}) || await Admin.findOne({ role: 'super_admin' });
    if (!admin) {
      console.error('No admin found.');
      return;
    }

    const log = await AuditLog.logAction({
      action: 'ADMIN_LOGIN_TEST',
      actionType: 'login',
      module: 'auth',
      performedBy: admin._id,
      userType: 'admin',
      targetResource: 'Authentication',
      targetId: admin._id,
      description: 'Seed test log for admin login',
      severity: 'low',
      status: 'success',
      session: { ipAddress: '127.0.0.1', userAgent: 'TraeAI-Test' },
      metadata: { seed: true }
    });

    console.log('Inserted log id:', log._id.toString());
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();