const axios = require('axios');

async function testSuccessRegistration() {
  try {
    console.log('Testing seller registration with valid data...');
    
    const timestamp = Date.now();
    const response = await axios.post('http://localhost:8000/api/auth/register/seller', {
      firstName: 'John',
      lastName: 'Doe',
      businessName: 'Test Business LLC',
      businessType: 'company', // Valid type
      email: `test.success.${timestamp}@example.com`, // Unique email
      password: 'TestPassword123!',
      phone: `077712${timestamp.toString().slice(-4)}`, // Unique phone
      businessRegistrationNumber: `BR${timestamp}`, // Unique registration number
      taxId: `TX${timestamp}`, // Unique tax ID
      businessAddress: '123 Business St',
      businessDescription: 'A test business for validation'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('Error Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
      console.log('Full Error:', error);
    }
  }
}

testSuccessRegistration();