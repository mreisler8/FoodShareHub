const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// First login
async function testSearch() {
  try {
    console.log('Testing search API...\n');
    
    // Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'mitch.reisler@gmail.com',
      password: 'password123'
    }, {
      withCredentials: true
    });
    
    const cookies = loginResponse.headers['set-cookie'];
    console.log('Login successful!\n');
    
    // Test search for "Badiali in Toronto"
    console.log('2. Testing search for "Badiali in Toronto"...');
    const searchResponse = await axios.get(`${BASE_URL}/api/search/unified?q=Badiali%20in%20Toronto`, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    console.log('Search response:', JSON.stringify(searchResponse.data, null, 2));
    
    // Test general search
    console.log('\n3. Testing general search for "pizza"...');
    const pizzaResponse = await axios.get(`${BASE_URL}/api/search/unified?q=pizza`, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    console.log('Pizza search response:', JSON.stringify(pizzaResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testSearch();