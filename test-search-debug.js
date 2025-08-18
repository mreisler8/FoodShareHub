const https = require('http');

// Test search directly
const testSearch = async () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/search/unified?q=badiali&limit=10',
    method: 'GET',
    headers: {
      'Cookie': 'connect.sid=s%3ANnvadW6VKmjKpSuq3iyIeCkv4SwZ_Tbz.Kp%2F82js4tyKeHBeaPw%2BFAbwuozSdBbGJ%2B20BEp1dexM',
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
};

testSearch();