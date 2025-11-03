/*
 * Script: fix-ui-inputType.js
 * Purpose: Normalize AdminSettings.ui.inputType from 'switch' to 'boolean'
 * Usage: node scripts/fix-ui-inputType.js
 */

const { initializeDatabase, closeDatabase } = require('../config/database');
const mongoose = require('mongoose');

async function main() {
  try {
    await initializeDatabase();
    const AdminSettings = mongoose.model('AdminSettings');

    const res = await AdminSettings.updateMany(
      { 'ui.inputType': 'switch' },
      { $set: { 'ui.inputType': 'boolean' } }
    );

    console.log('Updated documents:', res.modifiedCount || res.nModified || 0);
  } catch (err) {
    console.error('Failed to normalize ui.inputType:', err.message);
  } finally {
    await closeDatabase();
  }
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exitCode = 1;
});