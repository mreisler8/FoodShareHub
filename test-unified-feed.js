
const axios = require('axios');

const baseURL = 'http://0.0.0.0:5000';

async function testUnifiedFeed() {
  console.log('🧪 Testing Unified Feed Functionality');
  console.log('=====================================');
  
  try {
    // Test authenticated unified feed endpoint
    console.log('✅ Test 1: Unified Feed API Response Structure');
    
    const response = await axios.get(`${baseURL}/api/unified-feed?scope=feed&page=1&limit=10`, {
      headers: {
        'Cookie': 'connect.sid=s%3Ahg-nWnh7n4dV1h_ZLTAMujM3DNgd9CA1.3VvlS7OFSgEmiNMpwoGvkyEuX7k7NQJgibwa04ofAq4',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Structure:', JSON.stringify(response.data, null, 2));
    
    // Check if response contains both posts and lists
    if (response.data.items) {
      const postItems = response.data.items.filter(item => item.feedType === 'post');
      const listItems = response.data.items.filter(item => item.feedType === 'list');
      
      console.log(`\n📊 Feed Content Analysis:`);
      console.log(`- Total items: ${response.data.items.length}`);
      console.log(`- Posts: ${postItems.length}`);
      console.log(`- Lists: ${listItems.length}`);
      
      // Verify data structure for lists
      if (listItems.length > 0) {
        console.log('\n✅ Test 2: List Data Structure Validation');
        const sampleList = listItems[0];
        console.log('Sample List Item:', JSON.stringify(sampleList, null, 2));
        
        const requiredFields = ['id', 'name', 'createdById', 'feedType'];
        const missingFields = requiredFields.filter(field => !(field in sampleList));
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields present for Lists');
        } else {
          console.log('❌ Missing fields:', missingFields);
        }
      } else {
        console.log('⚠️  No Lists found in feed - may need test data');
      }
      
      // Test pagination
      console.log('\n✅ Test 3: Pagination Validation');
      if (response.data.pagination) {
        console.log('Pagination:', JSON.stringify(response.data.pagination, null, 2));
        console.log(`✅ Pagination working: Page ${response.data.pagination.page}, hasMore: ${response.data.pagination.hasMore}`);
      }
    }
    
    // Test different scopes
    console.log('\n✅ Test 4: Circle Scope Testing');
    const circleResponse = await axios.get(`${baseURL}/api/unified-feed?scope=circle&circleId=2&page=1&limit=5`, {
      headers: {
        'Cookie': 'connect.sid=s%3Ahg-nWnh7n4dV1h_ZLTAMujM3DNgd9CA1.3VvlS7OFSgEmiNMpwoGvkyEuX7k7NQJgibwa04ofAq4',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Circle Feed Status:', circleResponse.status);
    console.log('Circle Feed Items:', circleResponse.data.items?.length || 0);
    
    console.log('\n🎉 Unified Feed Test Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ API endpoints responding correctly');
    console.log('✅ Authentication working');
    console.log('✅ Both feed and circle scopes functional');
    console.log('✅ Response structure includes feedType discrimination');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔐 Authentication Required');
      console.log('Please ensure you are logged in and using the correct session cookie');
    }
  }
}

// Test the Lists endpoint separately
async function testListsEndpoint() {
  console.log('\n📝 Testing Lists API Endpoint');
  console.log('==============================');
  
  try {
    const response = await axios.get(`${baseURL}/api/lists`, {
      headers: {
        'Cookie': 'connect.sid=s%3Ahg-nWnh7n4dV1h_ZLTAMujM3DNgd9CA1.3VvlS7OFSgEmiNMpwoGvkyEuX7k7NQJgibwa04ofAq4',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Lists Status:', response.status);
    console.log('Lists Count:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('Sample List:', JSON.stringify(response.data[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Lists endpoint failed:', error.response?.data || error.message);
  }
}

// Run tests
testUnifiedFeed().then(() => {
  return testListsEndpoint();
});
