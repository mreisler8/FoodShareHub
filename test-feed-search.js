
const fetch = require('node-fetch');

async function testFeedSearch() {
  console.log('🔍 Testing Feed Search Prioritization Framework');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test with location (should prioritize Google Places)
  console.log('\n1. Testing "Badiali" with location (Toronto)');
  try {
    const response = await fetch(`${baseUrl}/api/search/unified?q=badiali&lat=43.6532&lng=-79.3832&radius=10000`);
    const data = await response.json();
    
    console.log('Results with location:');
    data.results?.restaurants?.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.source}, score: ${r.relevanceScore}, distance: ${r.distance}m)`);
    });
  } catch (error) {
    console.error('Location search failed:', error.message);
  }
  
  // Test without location (should still check Google Places)
  console.log('\n2. Testing "Badiali" without location');
  try {
    const response = await fetch(`${baseUrl}/api/search/unified?q=badiali`);
    const data = await response.json();
    
    console.log('Results without location:');
    data.results?.restaurants?.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.source}, score: ${r.relevanceScore})`);
    });
  } catch (error) {
    console.error('No-location search failed:', error.message);
  }
  
  // Test generic search with location
  console.log('\n3. Testing "pizza" with location (should prioritize nearby)');
  try {
    const response = await fetch(`${baseUrl}/api/search/unified?q=pizza&lat=43.6532&lng=-79.3832&radius=10000`);
    const data = await response.json();
    
    console.log('Pizza results with location:');
    data.results?.restaurants?.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.source}, score: ${r.relevanceScore}, distance: ${r.distance}m)`);
    });
  } catch (error) {
    console.error('Pizza search failed:', error.message);
  }
}

testFeedSearch().catch(console.error);
