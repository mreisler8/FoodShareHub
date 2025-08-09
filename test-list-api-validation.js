/**
 * MVP Validation: List Functionality API Test
 * Direct API validation without browser automation
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Test results tracking
const testResults = {
  listCreation: { public: false, circle: false, followers: false, private: false },
  addingItems: false,
  sharingToCircles: false,
  savingLists: false,
  reactingToLists: false,
  errors: []
};

// Using existing test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'testpass123'
};

let authCookie = '';
let userId = null;
let createdListIds = [];

// Helper to make authenticated requests
async function authenticatedRequest(method, path, data = null) {
  const config = {
    method,
    url: `${API_URL}${path}`,
    headers: {
      'Cookie': authCookie,
      'Content-Type': 'application/json'
    },
    validateStatus: () => true
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
}

// Login test user
async function loginTestUser() {
  try {
    console.log('Logging in test user...');
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (response.status === 200) {
      authCookie = response.headers['set-cookie']?.[0] || '';
      userId = response.data.id;
      console.log('✓ Login successful, user ID:', userId);
      return true;
    } else {
      throw new Error(`Login failed: ${response.data.error}`);
    }
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    testResults.errors.push({
      test: 'authentication',
      error: error.message,
      file: 'server/routes/auth.ts',
      recommendation: 'Check authentication endpoints and session handling'
    });
    return false;
  }
}

// Test 1: List Creation with Different Visibility Settings
async function testListCreation(visibility) {
  try {
    console.log(`  Testing list creation with visibility: ${visibility}`);
    
    const listData = {
      name: `Test List - ${visibility} - ${Date.now()}`,
      description: `Testing ${visibility} visibility list`,
      tags: ['test', visibility],
      makePublic: visibility === 'public',
      shareWithCircle: visibility === 'circle',
      visibility: visibility
    };

    const response = await authenticatedRequest('POST', '/lists', listData);

    if (response.status === 201 || response.status === 200) {
      const list = response.data;
      createdListIds.push(list.id);
      
      // Verify visibility settings
      if (visibility === 'public' && !list.makePublic) {
        throw new Error('Public list not properly set');
      }
      if (visibility === 'circle' && !list.shareWithCircle) {
        throw new Error('Circle visibility not properly set');
      }
      
      testResults.listCreation[visibility] = true;
      console.log(`    ✓ List created with ID: ${list.id}`);
      return list.id;
    } else {
      throw new Error(`API returned ${response.status}: ${response.data.error}`);
    }
  } catch (error) {
    testResults.errors.push({
      test: `listCreation-${visibility}`,
      error: error.message,
      file: 'server/routes/lists.ts:240-367',
      recommendation: 'Check list creation endpoint and visibility handling'
    });
    console.log(`    ✗ Failed: ${error.message}`);
    return null;
  }
}

// Test 2: Adding Items to List
async function testAddingItems() {
  try {
    console.log('  Testing adding items to list...');
    
    // Use the first created list
    const listId = createdListIds[0];
    if (!listId) {
      throw new Error('No list available for testing');
    }

    // Add first restaurant
    const item1 = {
      name: 'Test Restaurant 1',
      location: 'New York, NY',
      notes: 'Great food and atmosphere',
      position: 1,
      tags: ['italian', 'fine-dining']
    };

    const response1 = await authenticatedRequest('POST', `/lists/${listId}/restaurants`, item1);
    
    if (response1.status !== 200 && response1.status !== 201) {
      throw new Error(`Failed to add first item: ${response1.data.error}`);
    }

    // Add second restaurant
    const item2 = {
      name: 'Test Restaurant 2',
      location: 'Los Angeles, CA',
      notes: 'Amazing service',
      position: 2,
      tags: ['mexican', 'casual']
    };

    const response2 = await authenticatedRequest('POST', `/lists/${listId}/restaurants`, item2);
    
    if (response2.status !== 200 && response2.status !== 201) {
      throw new Error(`Failed to add second item: ${response2.data.error}`);
    }

    // Verify items were added
    const listResponse = await authenticatedRequest('GET', `/lists/${listId}`);
    
    if (listResponse.data.items && listResponse.data.items.length >= 2) {
      testResults.addingItems = true;
      console.log(`    ✓ Successfully added ${listResponse.data.items.length} items`);
      return true;
    } else {
      throw new Error('Items not properly added to list');
    }
  } catch (error) {
    testResults.errors.push({
      test: 'addingItems',
      error: error.message,
      file: 'server/routes/lists.ts:430-525',
      recommendation: 'Check add restaurant endpoint and list item creation'
    });
    console.log(`    ✗ Failed: ${error.message}`);
    return false;
  }
}

// Test 3: Sharing Lists to Circles
async function testSharingToCircles() {
  try {
    console.log('  Testing sharing lists to circles...');
    
    // Get user's circles
    const circlesResponse = await authenticatedRequest('GET', '/circles/my-circles');
    
    if (!circlesResponse.data || circlesResponse.data.length === 0) {
      console.log('    ⚠ No circles available for testing, skipping');
      return false;
    }

    const circleId = circlesResponse.data[0].id;
    const listId = createdListIds[1] || createdListIds[0]; // Use circle visibility list
    
    if (!listId) {
      throw new Error('No list available for sharing');
    }

    // Share list to circle
    const shareResponse = await authenticatedRequest('POST', `/lists/${listId}/share`, {
      circleId: circleId
    });

    if (shareResponse.status === 200 || shareResponse.status === 201) {
      testResults.sharingToCircles = true;
      console.log(`    ✓ List shared to circle ${circleId}`);
      return true;
    } else {
      throw new Error(`Sharing failed: ${shareResponse.data.error}`);
    }
  } catch (error) {
    testResults.errors.push({
      test: 'sharingToCircles',
      error: error.message,
      file: 'server/routes/lists.ts:800-850',
      recommendation: 'Check list sharing endpoint and circle permissions'
    });
    console.log(`    ✗ Failed: ${error.message}`);
    return false;
  }
}

// Test 4: Saving Lists
async function testSavingLists() {
  try {
    console.log('  Testing saving lists...');
    
    // Get a public list to save
    const publicListsResponse = await authenticatedRequest('GET', '/lists?filter=public');
    
    if (!publicListsResponse.data || publicListsResponse.data.length === 0) {
      // Create a public list if none exists
      const publicListId = await testListCreation('public');
      if (!publicListId) {
        throw new Error('No public lists available for saving');
      }
    }

    const listToSave = publicListsResponse.data?.[0] || { id: createdListIds[0] };
    
    // Save the list
    const saveResponse = await authenticatedRequest('POST', `/lists/${listToSave.id}/save`);

    if (saveResponse.status === 200 || saveResponse.status === 201) {
      // Verify list appears in saved lists
      const savedListsResponse = await authenticatedRequest('GET', '/saved-lists');
      
      if (savedListsResponse.data && savedListsResponse.data.some(l => l.listId === listToSave.id)) {
        testResults.savingLists = true;
        console.log(`    ✓ List saved successfully`);
        return true;
      } else {
        throw new Error('List not found in saved lists');
      }
    } else {
      throw new Error(`Save failed: ${saveResponse.data.error}`);
    }
  } catch (error) {
    testResults.errors.push({
      test: 'savingLists',
      error: error.message,
      file: 'server/routes/lists.ts:370-410',
      recommendation: 'Check save list endpoint and saved lists retrieval'
    });
    console.log(`    ✗ Failed: ${error.message}`);
    return false;
  }
}

// Test 5: Reacting to Lists
async function testReactingToLists() {
  try {
    console.log('  Testing reacting to lists...');
    
    const listId = createdListIds[0];
    if (!listId) {
      throw new Error('No list available for testing reactions');
    }

    const reactions = ['like', 'love', 'fire', 'clap'];
    let successCount = 0;

    for (const reaction of reactions) {
      const reactionResponse = await authenticatedRequest('POST', `/list-reactions/${listId}`, {
        type: reaction
      });

      if (reactionResponse.status === 200 || reactionResponse.status === 201) {
        successCount++;
        console.log(`      ✓ ${reaction} reaction added`);
      } else {
        console.log(`      ✗ ${reaction} failed: ${reactionResponse.data.error}`);
      }
    }

    // Verify reactions were saved
    const reactionsResponse = await authenticatedRequest('GET', `/list-reactions/${listId}`);
    
    if (successCount === reactions.length && reactionsResponse.data.hasReacted) {
      testResults.reactingToLists = true;
      console.log(`    ✓ All reactions working properly`);
      return true;
    } else {
      throw new Error(`Only ${successCount}/${reactions.length} reactions worked`);
    }
  } catch (error) {
    testResults.errors.push({
      test: 'reactingToLists',
      error: error.message,
      file: 'server/routes/list-reactions.ts',
      recommendation: 'Check reaction endpoints and database schema'
    });
    console.log(`    ✗ Failed: ${error.message}`);
    return false;
  }
}

// Additional validation checks
async function performAdditionalChecks() {
  console.log('\n--- Additional Validation Checks ---');
  
  // Check for duplicate headers
  console.log('  Checking for duplicate headers...');
  const response = await authenticatedRequest('GET', '/lists');
  if (response.headers['x-duplicate-header']) {
    testResults.errors.push({
      test: 'headers',
      error: 'Duplicate headers detected',
      file: 'client/src/components/layout/AppHeader.tsx',
      recommendation: 'Ensure single global AppHeader is used across all pages'
    });
    console.log('    ✗ Duplicate headers found');
  } else {
    console.log('    ✓ No duplicate headers');
  }

  // Check API response codes
  console.log('  Validating API response codes...');
  const endpoints = [
    { method: 'GET', path: '/lists', expectedStatus: 200 },
    { method: 'GET', path: '/lists/999999', expectedStatus: 404 },
    { method: 'GET', path: '/saved-lists', expectedStatus: 200 }
  ];

  for (const endpoint of endpoints) {
    const res = await authenticatedRequest(endpoint.method, endpoint.path);
    if (res.status !== endpoint.expectedStatus) {
      testResults.errors.push({
        test: 'api-codes',
        error: `${endpoint.path} returned ${res.status}, expected ${endpoint.expectedStatus}`,
        file: 'server/routes/lists.ts',
        recommendation: 'Check error handling and status codes'
      });
      console.log(`    ✗ ${endpoint.path}: ${res.status} (expected ${endpoint.expectedStatus})`);
    } else {
      console.log(`    ✓ ${endpoint.path}: ${res.status}`);
    }
  }
}

// Main test runner
async function runValidation() {
  console.log('=== Starting MVP List Functionality Validation ===\n');
  
  try {
    // Login
    const loginSuccess = await loginTestUser();
    if (!loginSuccess) {
      throw new Error('Cannot proceed without authentication');
    }

    console.log('\n--- Testing Core Functionality ---');
    
    // Test list creation with all visibility types
    console.log('\n1. List Creation:');
    for (const visibility of ['public', 'circle', 'followers', 'private']) {
      await testListCreation(visibility);
    }
    
    // Test adding items
    console.log('\n2. Adding Items:');
    await testAddingItems();
    
    // Test sharing to circles
    console.log('\n3. Sharing to Circles:');
    await testSharingToCircles();
    
    // Test saving lists
    console.log('\n4. Saving Lists:');
    await testSavingLists();
    
    // Test reactions
    console.log('\n5. Reacting to Lists:');
    await testReactingToLists();
    
    // Additional checks
    await performAdditionalChecks();
    
  } catch (error) {
    console.error('\nFatal error during validation:', error.message);
    testResults.errors.push({
      test: 'general',
      error: error.message,
      file: 'unknown',
      recommendation: 'Check overall test setup and environment'
    });
  }
  
  // Generate report
  generateReport();
}

// Generate validation report
function generateReport() {
  console.log('\n\n=== VALIDATION REPORT ===\n');
  
  console.log('Pass/Fail Matrix:');
  console.log('─────────────────────────────────────');
  
  // List Creation
  console.log('\nList Creation:');
  for (const [visibility, passed] of Object.entries(testResults.listCreation)) {
    console.log(`  ${visibility}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  }
  
  // Other tests
  console.log(`\nAdding Items: ${testResults.addingItems ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Sharing to Circles: ${testResults.sharingToCircles ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Saving Lists: ${testResults.savingLists ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Reacting to Lists: ${testResults.reactingToLists ? '✓ PASS' : '✗ FAIL'}`);
  
  // Errors and recommendations
  if (testResults.errors.length > 0) {
    console.log('\n─────────────────────────────────────');
    console.log('Errors and Fix Recommendations:\n');
    testResults.errors.forEach((err, index) => {
      console.log(`${index + 1}. Test: ${err.test}`);
      console.log(`   Error: ${err.error}`);
      console.log(`   File: ${err.file}`);
      console.log(`   Fix: ${err.recommendation}\n`);
    });
  }
  
  // Overall result
  const allPassed = 
    Object.values(testResults.listCreation).every(v => v) &&
    testResults.addingItems &&
    testResults.sharingToCircles &&
    testResults.savingLists &&
    testResults.reactingToLists;
  
  console.log('─────────────────────────────────────');
  console.log(`\nOverall Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  
  // Cleanup note
  if (createdListIds.length > 0) {
    console.log(`\nNote: Created ${createdListIds.length} test lists (IDs: ${createdListIds.join(', ')})`);
  }
  
  console.log('\n─────────────────────────────────────\n');
}

// Run the validation
runValidation().catch(console.error);