import axios from 'axios';
const baseURL = 'http://localhost:5000';

async function testFeed() {
  try {
    // Register a test user if needed
    try {
      const registerResponse = await axios.post(`${baseURL}/api/register`, {
        username: 'testuser',
        password: 'testpassword',
        name: 'Test User'
      });
      console.log('Registration successful', registerResponse.data);
    } catch (err) {
      // If user already exists, try to log in directly
      console.log('Registration error (maybe user already exists):', err.response?.data || err.message);
    }

    // Login to get session cookie
    const loginResponse = await axios.post(`${baseURL}/api/login`, {
      username: 'testuser',
      password: 'testpassword'
    }, { withCredentials: true });
    
    console.log('Login successful:', loginResponse.data);
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    console.log('Cookies:', cookies);
    
    // Create a configured axios instance with the cookie
    const axiosWithAuth = axios.create({
      baseURL,
      headers: {
        Cookie: cookies ? cookies.join('; ') : ''
      }
    });
    
    // Create a test post
    const postResponse = await axiosWithAuth.post('/api/posts', {
      userId: loginResponse.data.id,
      restaurantId: 1, // Assuming restaurant with ID 1 exists
      content: 'Test post for feed pagination',
      rating: 5, // Add required rating (1-5)
      visibility: 'public', // Add required visibility
      tags: ['test', 'pagination'],
      imageUrl: null,
      dishName: 'Test Dish'
    });
    
    console.log('Post created:', postResponse.data);
    
    // Test feed with pagination
    const feedResponse = await axiosWithAuth.get('/api/feed?page=1&limit=10');
    
    console.log('Feed response:', JSON.stringify(feedResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error during test:', error.response?.data || error.message);
  }
}

testFeed();