require('dotenv').config();
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('Missing MONGODB_URI');
      process.exit(1);
    }
    await mongoose.connect(uri);
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(10).lean();
    console.log('Latest audit logs:', logs.map(l => ({
      id: l._id,
      ts: l.timestamp,
      action: l.action,
      userType: l.userType,
      performedBy: l.performedBy,
      severity: l.severity,
      description: l.description,
      ip: l.session?.ipAddress
    })));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();