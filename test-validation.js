const axios = require('axios');

async function testValidation() {
  try {
    console.log('Testing seller registration with invalid businessType...');
    
    const response = await axios.post('http://localhost:8000/api/auth/register/seller', {
      businessName: 'Test Business',
      businessType: 'company', // Invalid type
      email: 'test.validation@example.com',
      password: 'TestPassword123!',
      phone: '0777123456',
      businessRegistrationNumber: 'BR123456789',
      taxId: 'TX987654321',
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
    }
  }
}

testValidation();