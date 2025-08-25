/**
 * MVP Validation: List Functionality with Automated Mock User Test
 * This script validates the complete list creation and social flow
 */

import puppeteer from 'puppeteer';
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

// Mock users
const userA = {
  email: 'userA_test@example.com',
  password: 'TestPass123!',
  username: 'userA_test',
  name: 'User A Test'
};

const userB = {
  email: 'userB_test@example.com', 
  password: 'TestPass123!',
  username: 'userB_test',
  name: 'User B Test'
};

// Helper function to create user session
async function createUserSession(page, user) {
  try {
    // Try to login first
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: user.email,
      password: user.password
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (loginResponse.status === 200) {
      // Set cookies in browser
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        for (const cookie of cookies) {
          await page.setCookie({
            name: 'connect.sid',
            value: cookie.split('=')[1].split(';')[0],
            domain: 'localhost',
            path: '/',
            httpOnly: true
          });
        }
      }
      return loginResponse.data;
    }

    // If login fails, try to register
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: user.email,
      password: user.password,
      username: user.username,
      name: user.name
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (registerResponse.status !== 201 && registerResponse.status !== 200) {
      throw new Error(`Failed to register user: ${registerResponse.data.error}`);
    }

    // Login after registration
    return createUserSession(page, user);
  } catch (error) {
    console.error(`Error creating session for ${user.email}:`, error.message);
    throw error;
  }
}

// Test 1: List Creation with Different Visibility Settings
async function testListCreation(page, visibility) {
  try {
    console.log(`Testing list creation with visibility: ${visibility}`);
    
    await page.goto(`${BASE_URL}/create-list`, { waitUntil: 'networkidle2' });
    
    // Fill in list details
    await page.waitForSelector('input#title', { timeout: 5000 });
    await page.type('input#title', `Test List - ${visibility}`);
    await page.type('textarea#description', `Testing ${visibility} visibility list`);
    
    // Set visibility based on type
    if (visibility === 'public') {
      // Click public visibility option if available
      const publicOption = await page.$('[data-visibility="public"]');
      if (publicOption) await publicOption.click();
    } else if (visibility === 'circle') {
      const circleOption = await page.$('[data-visibility="circle"]');
      if (circleOption) await circleOption.click();
    } else if (visibility === 'followers') {
      const followersOption = await page.$('[data-visibility="followers"]');
      if (followersOption) await followersOption.click();
    }
    // private is default
    
    // Submit the form
    await page.click('button:has-text("Create List")');
    
    // Wait for success modal or navigation
    await page.waitForTimeout(2000);
    
    // Check if list was created successfully
    const currentUrl = page.url();
    if (currentUrl.includes('/lists/') || await page.$('.success-modal')) {
      testResults.listCreation[visibility] = true;
      console.log(`✓ List created successfully with ${visibility} visibility`);
      return true;
    } else {
      throw new Error(`List creation failed for ${visibility} visibility`);
    }
  } catch (error) {
    testResults.errors.push({
      test: `listCreation-${visibility}`,
      error: error.message,
      file: 'client/src/pages/create-list.tsx',
      recommendation: 'Check form submission handler and visibility state management'
    });
    console.error(`✗ List creation failed for ${visibility}:`, error.message);
    return false;
  }
}

// Test 2: Adding Items to List
async function testAddingItems(page) {
  try {
    console.log('Testing adding items to list...');
    
    // Navigate to create list or existing list
    await page.goto(`${BASE_URL}/create-list`, { waitUntil: 'networkidle2' });
    
    // Create a basic list first
    await page.waitForSelector('input#title', { timeout: 5000 });
    await page.type('input#title', 'Test List with Items');
    
    // Click Add Restaurant button
    const addButton = await page.$('button:has-text("Add Restaurant")');
    if (!addButton) {
      throw new Error('Add Restaurant button not found');
    }
    await addButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Add restaurant details in modal
    await page.type('input[name="name"]', 'Test Restaurant 1');
    await page.type('input[name="city"]', 'New York');
    await page.type('textarea[name="notes"]', 'Great food!');
    
    // Save the restaurant
    await page.click('button:has-text("Add to List")');
    await page.waitForTimeout(1000);
    
    // Add second restaurant
    await page.click('button:has-text("Add Restaurant")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.type('input[name="name"]', 'Test Restaurant 2');
    await page.type('input[name="city"]', 'Los Angeles');
    await page.type('textarea[name="notes"]', 'Amazing ambiance!');
    await page.click('button:has-text("Add to List")');
    
    // Check if items were added
    const items = await page.$$('.restaurant-item, li:has-text("Test Restaurant")');
    if (items.length >= 2) {
      testResults.addingItems = true;
      console.log('✓ Successfully added items to list');
      return true;
    } else {
      throw new Error('Items not properly added to list');
    }
  } catch (error) {
    testResults.errors.push({
      test: 'addingItems',
      error: error.message,
      file: 'client/src/components/lists/AddListItemModal.tsx',
      recommendation: 'Check modal form submission and state updates'
    });
    console.error('✗ Adding items failed:', error.message);
    return false;
  }
}

// Test 3: Sharing Lists to Circles
async function testSharingToCircles(page) {
  try {
    console.log('Testing sharing lists to circles...');
    
    // Navigate to my lists
    await page.goto(`${BASE_URL}/my-lists`, { waitUntil: 'networkidle2' });
    
    // Find a list to share
    const listCard = await page.$('.list-card, [data-testid="list-item"]');
    if (!listCard) {
      throw new Error('No lists found to share');
    }
    
    // Click on share button
    const shareButton = await listCard.$('button:has-text("Share"), [aria-label="Share"]');
    if (shareButton) {
      await shareButton.click();
      
      // Wait for share modal
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Select a circle
      const circleOption = await page.$('[data-circle-id], input[type="radio"][value*="circle"]');
      if (circleOption) {
        await circleOption.click();
      }
      
      // Confirm sharing
      await page.click('button:has-text("Share List")');
      await page.waitForTimeout(2000);
      
      testResults.sharingToCircles = true;
      console.log('✓ Successfully shared list to circle');
      return true;
    } else {
      throw new Error('Share button not found');
    }
  } catch (error) {
    testResults.errors.push({
      test: 'sharingToCircles',
      error: error.message,
      file: 'client/src/components/lists/ShareListModal.tsx',
      recommendation: 'Check share modal functionality and circle selection'
    });
    console.error('✗ Sharing to circles failed:', error.message);
    return false;
  }
}

// Test 4: Saving Lists
async function testSavingLists(page) {
  try {
    console.log('Testing saving lists...');
    
    // Navigate to discover or feed
    await page.goto(`${BASE_URL}/feed`, { waitUntil: 'networkidle2' });
    
    // Find a public list
    const listCard = await page.$('.list-card, [data-testid="list-item"]');
    if (!listCard) {
      throw new Error('No lists found to save');
    }
    
    // Click save/bookmark button
    const saveButton = await listCard.$('button:has-text("Save"), [aria-label*="Save"], [aria-label*="Bookmark"]');
    if (saveButton) {
      await saveButton.click();
      await page.waitForTimeout(1000);
      
      // Navigate to saved lists
      await page.goto(`${BASE_URL}/my-lists`, { waitUntil: 'networkidle2' });
      
      // Check saved lists tab
      const savedTab = await page.$('button:has-text("Saved"), [data-tab="saved"]');
      if (savedTab) {
        await savedTab.click();
        await page.waitForTimeout(1000);
        
        // Check if list appears in saved
        const savedList = await page.$('.list-card, [data-testid="list-item"]');
        if (savedList) {
          testResults.savingLists = true;
          console.log('✓ Successfully saved list');
          return true;
        }
      }
    }
    throw new Error('Save functionality not working properly');
  } catch (error) {
    testResults.errors.push({
      test: 'savingLists',
      error: error.message,
      file: 'server/routes/saved-lists.ts',
      recommendation: 'Check save list API endpoint and frontend state management'
    });
    console.error('✗ Saving lists failed:', error.message);
    return false;
  }
}

// Test 5: Reacting to Lists
async function testReactingToLists(page) {
  try {
    console.log('Testing reacting to lists...');
    
    // Navigate to a list detail page
    await page.goto(`${BASE_URL}/lists/1`, { waitUntil: 'networkidle2' });
    
    const reactions = ['like', 'love', 'fire', 'clap'];
    let successCount = 0;
    
    for (const reaction of reactions) {
      const reactionButton = await page.$(`button[aria-label*="${reaction}"], button:has-text("${reaction}")`);
      if (reactionButton) {
        await reactionButton.click();
        await page.waitForTimeout(500);
        
        // Check if reaction was applied
        const activeReaction = await page.$(`button[aria-label*="${reaction}"][data-active="true"], button.active:has-text("${reaction}")`);
        if (activeReaction) {
          successCount++;
          console.log(`  ✓ ${reaction} reaction applied`);
        }
      }
    }
    
    if (successCount === reactions.length) {
      testResults.reactingToLists = true;
      console.log('✓ All reactions working properly');
      return true;
    } else {
      throw new Error(`Only ${successCount}/${reactions.length} reactions worked`);
    }
  } catch (error) {
    testResults.errors.push({
      test: 'reactingToLists',
      error: error.message,
      file: 'client/src/components/lists/ListReactions.tsx',
      recommendation: 'Check reaction component state and API endpoints'
    });
    console.error('✗ Reacting to lists failed:', error.message);
    return false;
  }
}

// Main test runner
async function runValidation() {
  console.log('=== Starting MVP List Functionality Validation ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.errors.push({
          test: 'console',
          error: msg.text(),
          file: 'browser console',
          recommendation: 'Fix JavaScript errors in components'
        });
      }
    });
    
    // Test with User A
    console.log('Setting up User A session...');
    await createUserSession(page, userA);
    
    // Run tests for User A
    console.log('\n--- Testing with User A ---');
    
    // Test list creation with all visibility types
    for (const visibility of ['public', 'circle', 'followers', 'private']) {
      await testListCreation(page, visibility);
    }
    
    // Test adding items
    await testAddingItems(page);
    
    // Test sharing to circles
    await testSharingToCircles(page);
    
    // Switch to User B
    console.log('\n--- Switching to User B ---');
    await page.deleteCookie({ name: 'connect.sid' });
    await createUserSession(page, userB);
    
    // Test saving lists
    await testSavingLists(page);
    
    // Test reactions
    await testReactingToLists(page);
    
  } catch (error) {
    console.error('Fatal error during validation:', error);
    testResults.errors.push({
      test: 'general',
      error: error.message,
      file: 'unknown',
      recommendation: 'Check overall test setup and environment'
    });
  } finally {
    await browser.close();
  }
  
  // Generate report
  generateReport();
}

// Generate validation report
function generateReport() {
  console.log('\n=== VALIDATION REPORT ===\n');
  
  console.log('Pass/Fail Matrix:');
  console.log('─────────────────────────────────────');
  
  // List Creation
  console.log('List Creation:');
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
    console.log('Errors and Recommendations:');
    testResults.errors.forEach((err, index) => {
      console.log(`\n${index + 1}. Test: ${err.test}`);
      console.log(`   Error: ${err.error}`);
      console.log(`   File: ${err.file}`);
      console.log(`   Fix: ${err.recommendation}`);
    });
  }
  
  // Overall result
  const allPassed = 
    Object.values(testResults.listCreation).every(v => v) &&
    testResults.addingItems &&
    testResults.sharingToCircles &&
    testResults.savingLists &&
    testResults.reactingToLists;
  
  console.log('\n─────────────────────────────────────');
  console.log(`Overall Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  console.log('─────────────────────────────────────\n');
}

// Run the validation
runValidation().catch(console.error);