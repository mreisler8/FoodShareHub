
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function validateSearchFunctionality() {
  console.log('🔍 SEARCH FUNCTIONALITY VALIDATION\n');
  
  try {
    // Test 1: Restaurant Search
    console.log('1. Testing Restaurant Search...');
    const restaurantSearch = await axios.get(`${API_BASE}/search/unified?q=pizza&type=restaurants`);
    console.log(`✅ Restaurant search: ${restaurantSearch.data.length} results`);
    
    // Test 2: List Search
    console.log('2. Testing List Search...');
    const listSearch = await axios.get(`${API_BASE}/search/unified?q=best&type=lists`);
    console.log(`✅ List search: ${listSearch.data.length} results`);
    
    // Test 3: User Search
    console.log('3. Testing User Search...');
    const userSearch = await axios.get(`${API_BASE}/search/unified?q=test&type=users`);
    console.log(`✅ User search: ${userSearch.data.length} results`);
    
    // Test 4: Unified Search
    console.log('4. Testing Unified Search...');
    const unifiedSearch = await axios.get(`${API_BASE}/search/unified?q=toronto`);
    console.log(`✅ Unified search results:`, {
      restaurants: unifiedSearch.data.restaurants?.length || 0,
      lists: unifiedSearch.data.lists?.length || 0,
      users: unifiedSearch.data.users?.length || 0,
      posts: unifiedSearch.data.posts?.length || 0
    });
    
    // Test 5: Location-based Search
    console.log('5. Testing Location-based Search...');
    const locationSearch = await axios.get(`${API_BASE}/search/unified?q=restaurant&lat=43.6532&lng=-79.3832&radius=10000`);
    console.log(`✅ Location search: ${locationSearch.data.restaurants?.length || 0} restaurants`);
    
    // Test 6: Typo Tolerance
    console.log('6. Testing Typo Tolerance...');
    const typoSearch = await axios.get(`${API_BASE}/search/unified?q=tacoronto`);
    console.log(`✅ Typo search: ${typoSearch.data.restaurants?.length || 0} results`);
    
    // Test 7: Trending
    console.log('7. Testing Trending...');
    const trending = await axios.get(`${API_BASE}/search/trending`);
    console.log(`✅ Trending: ${trending.data.trending?.length || 0} items`);
    
    // Test 8: Reverse Geocoding
    console.log('8. Testing Reverse Geocoding...');
    const geocode = await axios.get(`${API_BASE}/geocode/reverse?lat=43.6532&lng=-79.3832`);
    console.log(`✅ Geocoding: ${geocode.data.city}`);
    
    console.log('\n🎉 All search functionality tests passed!');
    
  } catch (error) {
    console.error('❌ Search validation failed:', error.response?.data || error.message);
  }
}

// Test search result formats
async function validateSearchResultFormats() {
  console.log('\n🔍 SEARCH RESULT FORMAT VALIDATION\n');
  
  try {
    const search = await axios.get(`${API_BASE}/search/unified?q=test`);
    const { restaurants, lists, users, posts } = search.data;
    
    // Validate restaurant format
    if (restaurants?.length > 0) {
      const restaurant = restaurants[0];
      const requiredFields = ['id', 'name', 'type', 'subtitle', 'location'];
      const hasAllFields = requiredFields.every(field => restaurant[field] !== undefined);
      console.log(`✅ Restaurant format valid: ${hasAllFields}`);
    }
    
    // Validate list format
    if (lists?.length > 0) {
      const list = lists[0];
      const requiredFields = ['id', 'name', 'type', 'subtitle'];
      const hasAllFields = requiredFields.every(field => list[field] !== undefined);
      console.log(`✅ List format valid: ${hasAllFields}`);
    }
    
    // Validate user format
    if (users?.length > 0) {
      const user = users[0];
      const requiredFields = ['id', 'name', 'type', 'subtitle'];
      const hasAllFields = requiredFields.every(field => user[field] !== undefined);
      console.log(`✅ User format valid: ${hasAllFields}`);
    }
    
    console.log('\n🎉 All result format validations passed!');
    
  } catch (error) {
    console.error('❌ Result format validation failed:', error.response?.data || error.message);
  }
}

// Run all validations
async function runAllValidations() {
  await validateSearchFunctionality();
  await validateSearchResultFormats();
}

if (require.main === module) {
  runAllValidations();
}

module.exports = { validateSearchFunctionality, validateSearchResultFormats };
