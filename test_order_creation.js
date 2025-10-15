const axios = require('axios');

async function testOrderCreation() {
    try {
        console.log('Testing server connectivity...');
        
        // Test health endpoint first
        try {
            const healthResponse = await axios.get('http://localhost:8000/health');
            console.log('Health check successful:', healthResponse.status);
        } catch (healthError) {
            console.log('Health check failed:', healthError.message);
            return;
        }
        
        console.log('Attempting login...');
        
        // Login first
        const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
            email: 'testuser@example.com',
            password: 'password123',
            userType: 'buyer'
        });
        
        const token = loginResponse.data.accessToken;
        console.log('Login successful, token obtained');
        
        // Create order
        const orderData = {
            items: [{
                product: '68ed816f9d4bceee45b454af',
                quantity: 2,
                unitPrice: 29.99
            }],
            shippingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                phone: '+260123456789',
                email: 'john.doe@example.com',
                street: '123 Test Street',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
                country: 'Zambia'
            },
            paymentMethod: 'card',
            notes: 'Test order for debugging'
        };
        
        console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
        
        const orderResponse = await axios.post('http://localhost:8000/api/orders', orderData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        console.log('Order created successfully:', JSON.stringify(orderResponse.data, null, 2));
        
    } catch (error) {
        console.log('Error occurred:');
        console.log('Error type:', error.constructor.name);
        console.log('Error code:', error.code);
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Error Message:', error.message);
        console.log('Full error:', error);
        
        if (error.response?.data?.errors) {
            console.log('Validation Errors:');
            error.response.data.errors.forEach(err => {
                console.log(`- ${err.field}: ${err.message}`);
            });
        }
    }
}

testOrderCreation();