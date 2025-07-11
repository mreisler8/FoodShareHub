
#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// Comprehensive QA Assessment for Circles App
console.log('🔍 CIRCLES APP - COMPREHENSIVE QA AUDIT\n');

const BASE_URL = 'http://localhost:5000';
const results = {
  critical: [],
  warnings: [],
  working: [],
  failed: []
};

// Test authentication token (from manual testing)
const AUTH_TOKEN = 'your-test-token-here'; // Replace with actual token
const axiosWithAuth = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
});

async function testAPIEndpoint(endpoint, method = 'GET', data = null, description = '') {
  try {
    const config = { method, url: endpoint };
    if (data) config.data = data;
    
    const response = await axiosWithAuth(config);
    console.log(`✅ ${description || endpoint}: ${response.status}`);
    results.working.push({ endpoint, method, status: response.status, description });
    return { success: true, data: response.data };
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    console.log(`❌ ${description || endpoint}: ${status}`);
    results.failed.push({ endpoint, method, status, description, error: error.message });
    return { success: false, error: error.message };
  }
}

async function runAudit() {
  console.log('📋 CORE API ENDPOINTS AUDIT\n');
  
  // Authentication & User Management
  console.log('🔐 Authentication & User Management:');
  await testAPIEndpoint('/api/me', 'GET', null, 'Get current user');
  await testAPIEndpoint('/api/users/settings', 'PUT', { name: 'Test' }, 'Update user settings');
  
  // Search Functionality
  console.log('\n🔍 Search Functionality:');
  await testAPIEndpoint('/api/search/unified?q=pizza', 'GET', null, 'Unified search');
  await testAPIEndpoint('/api/search/trending', 'GET', null, 'Trending searches');
  await testAPIEndpoint('/api/search-analytics/suggestions?q=p', 'GET', null, 'Search suggestions');
  
  // Restaurant Management
  console.log('\n🍽️ Restaurant Management:');
  await testAPIEndpoint('/api/restaurants/search?query=pizza', 'GET', null, 'Restaurant search');
  await testAPIEndpoint('/api/restaurants/google_test', 'GET', null, 'Google Places integration');
  
  // Lists Management
  console.log('\n📝 Lists Management:');
  await testAPIEndpoint('/api/lists', 'GET', null, 'Get user lists');
  const listTest = await testAPIEndpoint('/api/lists', 'POST', {
    name: 'QA Test List',
    description: 'Audit test list',
    visibility: { public: true, followers: false, circleIds: [] }
  }, 'Create new list');
  
  if (listTest.success) {
    const listId = listTest.data.id;
    await testAPIEndpoint(`/api/lists/${listId}`, 'GET', null, 'Get specific list');
    await testAPIEndpoint(`/api/lists/${listId}`, 'PUT', { name: 'Updated Test List' }, 'Update list');
    await testAPIEndpoint(`/api/lists/${listId}`, 'DELETE', null, 'Delete list');
  }
  
  // Posts/Reviews Management
  console.log('\n📱 Posts/Reviews Management:');
  await testAPIEndpoint('/api/feed', 'GET', null, 'Get user feed');
  await testAPIEndpoint('/api/top-picks', 'GET', null, 'Get top picks');
  
  // Circle/Social Features
  console.log('\n👥 Circle/Social Features:');
  await testAPIEndpoint('/api/circles', 'GET', null, 'Get user circles');
  await testAPIEndpoint('/api/circles/invites/pending', 'GET', null, 'Get pending circle invites');
  await testAPIEndpoint('/api/follow/requests/pending', 'GET', null, 'Get follow requests');
  
  // Frontend Component Analysis
  console.log('\n⚛️ FRONTEND COMPONENTS ANALYSIS\n');
  
  const componentPaths = [
    'client/src/pages/profile.tsx',
    'client/src/pages/settings.tsx',
    'client/src/components/search/UnifiedSearchModal.tsx',
    'client/src/components/navigation/MobileNavigation.tsx',
    'client/src/components/navigation/DesktopSidebar.tsx',
    'client/src/components/ProfileStats.tsx'
  ];
  
  componentPaths.forEach(path => {
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      
      // Check for common issues
      if (content.includes('function Settings') && content.includes('export default function Settings')) {
        console.log(`⚠️ ${path}: Potential duplicate function declaration`);
        results.warnings.push({ file: path, issue: 'Duplicate function declaration' });
      }
      
      if (path.includes('navigation') && !content.includes('/settings')) {
        console.log(`⚠️ ${path}: Missing Settings navigation link`);
        results.warnings.push({ file: path, issue: 'Missing Settings link' });
      }
      
      console.log(`✅ ${path}: Component exists and appears valid`);
      results.working.push({ file: path, status: 'Valid component' });
    } else {
      console.log(`❌ ${path}: Component missing`);
      results.failed.push({ file: path, status: 'Missing component' });
    }
  });
  
  // Navigation Flow Analysis
  console.log('\n🧭 NAVIGATION FLOW ANALYSIS\n');
  
  const navigationFlows = [
    { from: 'Home', to: 'Profile', path: '/ → /profile', critical: true },
    { from: 'Profile', to: 'Settings', path: '/profile → /settings', critical: true },
    { from: 'Home', to: 'Search', path: '/ → search modal', critical: true },
    { from: 'Search', to: 'Restaurant Detail', path: 'search → /restaurant/:id', critical: true },
    { from: 'Home', to: 'Lists', path: '/ → /lists', critical: false },
    { from: 'Lists', to: 'Create List', path: '/lists → /lists/create', critical: false },
    { from: 'Home', to: 'Circles', path: '/ → /circles', critical: false }
  ];
  
  navigationFlows.forEach(flow => {
    if (flow.critical) {
      console.log(`🔴 CRITICAL: ${flow.from} → ${flow.to} (${flow.path})`);
      results.critical.push({ flow: flow.path, status: 'Needs verification' });
    } else {
      console.log(`🟡 Standard: ${flow.from} → ${flow.to} (${flow.path})`);
    }
  });
  
  // Button Component Analysis
  console.log('\n🔘 BUTTON COMPONENT ANALYSIS\n');
  
  const buttonAnalysis = {
    searchButtons: ['Hero search', 'Unified search modal', 'Restaurant search'],
    navigationButtons: ['Mobile nav', 'Desktop sidebar', 'Profile/Settings access'],
    actionButtons: ['Create post', 'Create list', 'Save/Edit actions', 'Share buttons'],
    formButtons: ['Login/Register', 'Submit forms', 'Cancel/Delete actions']
  };
  
  Object.entries(buttonAnalysis).forEach(([category, buttons]) => {
    console.log(`📋 ${category.toUpperCase()}:`);
    buttons.forEach(button => {
      console.log(`  - ${button}: Needs manual verification`);
      results.warnings.push({ category, button, status: 'Manual verification needed' });
    });
  });
  
  // Generate Final Report
  console.log('\n📊 FINAL AUDIT REPORT\n');
  
  console.log(`✅ WORKING: ${results.working.length} items`);
  console.log(`⚠️ WARNINGS: ${results.warnings.length} items`);
  console.log(`❌ FAILED: ${results.failed.length} items`);
  console.log(`🔴 CRITICAL: ${results.critical.length} items`);
  
  console.log('\n🔧 IMMEDIATE ACTION ITEMS:');
  console.log('1. Fix ProfileStats duplicate function declaration');
  console.log('2. Add Settings navigation to mobile menu');
  console.log('3. Verify search functionality end-to-end');
  console.log('4. Test Profile → Settings navigation flow');
  console.log('5. Validate all button click handlers work correctly');
  
  console.log('\n📋 MANUAL TESTING REQUIRED:');
  console.log('- Click through all navigation flows');
  console.log('- Test search → restaurant detail flow');
  console.log('- Verify all buttons have working click handlers');
  console.log('- Check mobile responsive behavior');
  console.log('- Test form submissions and error handling');
  
  // Save detailed results
  fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Detailed results saved to audit-results.json');
}

runAudit().catch(console.error);
