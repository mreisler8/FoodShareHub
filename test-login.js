import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login on deployed URL...');
    
    const response = await fetch('https://569b8f5b-fe7d-444a-a966-c78d010fa3fe-00-13fjnyyxri63e.kirk.replit.dev/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Client'
      },
      body: JSON.stringify({
        username: 'mitch.reisler@gmail.com',
        password: 'coach000'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
    } else {
      const error = await response.text();
      console.log('Login failed:', error);
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testLogin();