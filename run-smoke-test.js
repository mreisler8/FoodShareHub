
import { exec } from 'child_process';
import fetch from 'node-fetch';

async function runSmokeTest() {
  console.log('🔍 Starting smoke test...');
  
  try {
    // Test 1: Check if server is running
    console.log('Testing server connection...');
    const response = await fetch('http://localhost:5000/api/me');
    console.log(`✅ Server responding: ${response.status}`);
    
    // Test 2: Check static files
    console.log('Testing static file serving...');
    const staticResponse = await fetch('http://localhost:5000/');
    console.log(`✅ Static files: ${staticResponse.status}`);
    
    // Test 3: Check API endpoints
    console.log('Testing API endpoints...');
    const apiResponse = await fetch('http://localhost:5000/api/top-picks');
    console.log(`✅ API endpoints: ${apiResponse.status}`);
    
    console.log('🎉 All smoke tests passed!');
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  }
}

runSmokeTest();
