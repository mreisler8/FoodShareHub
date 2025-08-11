#!/usr/bin/env node

/**
 * Authenticated Performance Load Test for Search Endpoints
 * Tests P95 ≤ 300ms target under concurrent load with authentication
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000';
const TEST_CREDENTIALS = {
  username: 'mitch.reisler@gmail.com',
  password: 'password123'
};

let authCookie = '';

// Test configuration
const ENDPOINTS = [
  { path: '/api/search/restaurants', name: 'Restaurant Search', queries: ['pizza', 'sushi', 'burger', 'italian'] },
  { path: '/api/search/users', name: 'User Search', queries: ['test', 'user', 'john', 'admin'] },
  { path: '/api/search/lists', name: 'List Search', queries: ['brunch', 'dinner', 'best', 'favorite'] },
  { path: '/api/search/unified', name: 'Unified Search', queries: ['food', 'restaurant', 'pizza', 'toronto'] }
];

const CONCURRENT_LOADS = [50, 100];
const TARGET_P95_MS = 300;
const WARMUP_DURATION_MS = 30000; // 30 seconds
const TEST_DURATION_MS = 60000; // 1 minute per load test

async function authenticate() {
  try {
    console.log('🔐 Authenticating for load tests...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.headers['set-cookie']) {
      authCookie = loginResponse.headers['set-cookie'][0];
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.log('❌ Authentication failed - no session cookie received');
      return false;
    }
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.response?.data?.message || error.message}`);
    console.log('📋 Manual Authentication Required:');
    console.log('   1. POST /api/auth/login with valid credentials');
    console.log('   2. Extract session cookie from Set-Cookie header');
    console.log('   3. Use cookie in subsequent requests: Cookie: connect.sid=...');
    return false;
  }
}

async function makeAuthenticatedRequest(endpoint, query, includeLocation = false) {
  const params = { q: query, limit: 20 };
  
  // Add location for restaurant searches
  if (includeLocation && endpoint.includes('restaurants')) {
    params.lat = 43.6532;
    params.lng = -79.3832; // Toronto coordinates
  }
  
  const config = {
    timeout: 10000,
    headers: { Cookie: authCookie },
    params
  };
  
  return axios.get(`${BASE_URL}${endpoint}`, config);
}

async function warmupCache(endpoints, duration = WARMUP_DURATION_MS) {
  console.log(`\n🔥 Cache warm-up phase (${duration/1000}s)...`);
  const startTime = Date.now();
  let requestCount = 0;
  
  const warmupPromises = [];
  
  while (Date.now() - startTime < duration) {
    for (const endpoint of endpoints) {
      for (const query of endpoint.queries) {
        const promise = makeAuthenticatedRequest(endpoint.path, query, true)
          .then(() => { requestCount++; })
          .catch(() => { /* Ignore warmup errors */ });
        warmupPromises.push(promise);
      }
    }
    
    // Brief pause between warmup batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await Promise.allSettled(warmupPromises);
  console.log(`   Completed ${requestCount} warmup requests`);
}

async function runConcurrentLoadTest(endpoint, concurrentUsers, testDuration = TEST_DURATION_MS) {
  console.log(`\n📊 Load Testing: ${endpoint.name} with ${concurrentUsers} concurrent users`);
  
  const startTime = Date.now();
  const results = [];
  const activeRequests = new Set();
  
  // Create concurrent user sessions
  for (let userId = 0; userId < concurrentUsers; userId++) {
    const userSession = async () => {
      let requestsCompleted = 0;
      
      while (Date.now() - startTime < testDuration) {
        const query = endpoint.queries[requestsCompleted % endpoint.queries.length];
        const requestStart = performance.now();
        
        try {
          const response = await makeAuthenticatedRequest(endpoint.path, query);
          const requestEnd = performance.now();
          const duration = requestEnd - requestStart;
          
          results.push({
            userId,
            duration,
            success: true,
            statusCode: response.status,
            resultCount: Array.isArray(response.data) ? response.data.length : 
                        (response.data.results?.length || response.data.restaurants?.length || 0),
            query,
            timestamp: Date.now()
          });
          
          requestsCompleted++;
          
        } catch (error) {
          const requestEnd = performance.now();
          results.push({
            userId,
            duration: requestEnd - requestStart,
            success: false,
            statusCode: error.response?.status || 'Network Error',
            error: error.message,
            query,
            timestamp: Date.now()
          });
        }
        
        // Brief pause between requests from same user
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      }
    };
    
    const promise = userSession();
    activeRequests.add(promise);
    promise.finally(() => activeRequests.delete(promise));
  }
  
  // Wait for all user sessions to complete
  await Promise.all(Array.from(activeRequests));
  
  // Calculate performance metrics
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  if (successfulResults.length === 0) {
    return {
      endpoint: endpoint.name,
      concurrentUsers,
      totalRequests: results.length,
      allRequestsFailed: true,
      errors: failedResults.map(f => ({ query: f.query, error: f.error, status: f.statusCode }))
    };
  }
  
  const durations = successfulResults.map(r => r.duration).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const errorRate = (failedResults.length / results.length) * 100;
  const throughput = successfulResults.length / (testDuration / 1000);
  
  const performanceResult = {
    endpoint: endpoint.name,
    concurrentUsers,
    totalRequests: results.length,
    successful: successfulResults.length,
    failed: failedResults.length,
    errorRate: Math.round(errorRate * 100) / 100,
    throughput: Math.round(throughput * 100) / 100,
    latency: {
      avg: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99)
    },
    passedP95Target: p95 <= TARGET_P95_MS
  };
  
  console.log(`   Results: ${successfulResults.length}/${results.length} successful`);
  console.log(`   P95: ${Math.round(p95)}ms (target: ≤${TARGET_P95_MS}ms) ${p95 <= TARGET_P95_MS ? '✅' : '❌'}`);
  console.log(`   P50: ${Math.round(p50)}ms, Avg: ${Math.round(avg)}ms`);
  console.log(`   Error Rate: ${errorRate.toFixed(1)}%`);
  console.log(`   Throughput: ${throughput.toFixed(1)} req/sec`);
  
  return performanceResult;
}

async function runAuthenticatedPerformanceTest() {
  console.log('🚀 Authenticated Search Performance Test Suite');
  console.log('==============================================');
  
  // Step 1: Authenticate
  const isAuthenticated = await authenticate();
  if (!isAuthenticated) {
    console.log('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Step 2: Warm up cache
  await warmupCache(ENDPOINTS, WARMUP_DURATION_MS);
  
  // Step 3: Run load tests
  const testResults = [];
  
  for (const concurrentUsers of CONCURRENT_LOADS) {
    console.log(`\n📈 Testing at ${concurrentUsers} Concurrent Users`);
    console.log('==========================================');
    
    for (const endpoint of ENDPOINTS) {
      const result = await runConcurrentLoadTest(endpoint, concurrentUsers);
      testResults.push(result);
      
      // Brief pause between endpoint tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Step 4: Generate summary
  console.log('\n📊 Performance Test Summary');
  console.log('============================');
  
  let allTestsPassed = true;
  
  for (const result of testResults) {
    if (result.allRequestsFailed) {
      console.log(`❌ ${result.endpoint} (${result.concurrentUsers} users): All requests failed`);
      allTestsPassed = false;
    } else {
      const status = result.passedP95Target ? '✅' : '❌';
      console.log(`${status} ${result.endpoint} (${result.concurrentUsers} users): P95 ${result.latency.p95}ms`);
      if (!result.passedP95Target) allTestsPassed = false;
    }
  }
  
  console.log('\n🎯 Target Achievement');
  console.log('====================');
  console.log(`Overall Performance Target (P95 ≤ ${TARGET_P95_MS}ms): ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All performance targets met! System ready for production.');
  } else {
    console.log('\n⚠️  Some performance targets not met. Review results above.');
  }
  
  return { testResults, allTestsPassed };
}

// Run performance test
runAuthenticatedPerformanceTest()
  .then(({ testResults, allTestsPassed }) => {
    process.exit(allTestsPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('Performance test execution failed:', error);
    process.exit(1);
  });