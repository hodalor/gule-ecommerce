const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use the seller ID from the database query
const sellerId = '68ed7a4b9e60579ff9b6bc00';

// Generate a new JWT token for the seller
const token = jwt.sign(
  {
    userId: sellerId,
    userType: 'seller'
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

console.log('New seller JWT token:');
console.log(token);
console.log('\nSeller ID:', sellerId);
console.log('User Type: seller');
console.log('Expires in:', process.env.JWT_EXPIRE || '7d');