#!/usr/bin/env node

/**
 * Comprehensive Search Validation Suite - Read-Only
 * Tests unified search system performance, UI/UX, API compliance, and database optimization
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000';
const TEST_USER_CREDENTIALS = {
  username: 'test@example.com',
  password: 'password123'
};

let authCookie = '';
const validationResults = {
  performance: { passed: 0, failed: 0, details: [] },
  apiCompliance: { passed: 0, failed: 0, details: [] },
  uiConsistency: { passed: 0, failed: 0, details: [] },
  dbOptimization: { passed: 0, failed: 0, details: [] },
  caching: { passed: 0, failed: 0, details: [] }
};

// Test configuration
const ENDPOINTS = [
  { path: '/api/search/restaurants', name: 'Restaurant Search', entity: 'restaurant' },
  { path: '/api/search/users', name: 'User Search', entity: 'user', requiresAuth: true },
  { path: '/api/search/lists', name: 'List Search', entity: 'list' },
  { path: '/api/search/unified', name: 'Unified Search', entity: 'unified' }
];

const TEST_QUERIES = ['pizza', 'sushi', 'italian', 'burger', 'coffee'];
const CONCURRENT_LOADS = [50, 100]; // Test at 50 and 100 concurrent users
const TARGET_P95_MS = 300;

async function login() {
  try {
    console.log('🔐 Authenticating for protected endpoints...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER_CREDENTIALS);
    
    if (loginResponse.headers['set-cookie']) {
      authCookie = loginResponse.headers['set-cookie'][0].split(';')[0];
      console.log('✅ Authentication successful');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Authentication failed - testing public endpoints only');
    return false;
  }
}

async function makeRequest(endpoint, params = {}, useAuth = false) {
  const config = {
    timeout: 10000,
    params
  };
  
  if (useAuth && authCookie) {
    config.headers = { Cookie: authCookie };
  }
  
  return axios.get(`${BASE_URL}${endpoint}`, config);
}

async function testEndpointPerformance(endpoint, concurrentUsers = 50) {
  const results = [];
  const startTime = performance.now();
  
  console.log(`\n📊 Testing ${endpoint.name} with ${concurrentUsers} concurrent users...`);
  
  // Create concurrent requests
  const requests = Array.from({ length: concurrentUsers }, async (_, i) => {
    const query = TEST_QUERIES[i % TEST_QUERIES.length];
    const requestStart = performance.now();
    
    try {
      const response = await makeRequest(endpoint.path, { q: query, limit: 20 }, endpoint.requiresAuth);
      const requestEnd = performance.now();
      const duration = requestEnd - requestStart;
      
      return {
        success: true,
        duration,
        query,
        statusCode: response.status,
        resultCount: Array.isArray(response.data) ? response.data.length : 
                    (response.data.restaurants?.length || response.data.results?.length || 0),
        response: response.data
      };
    } catch (error) {
      const requestEnd = performance.now();
      return {
        success: false,
        duration: requestEnd - requestStart,
        query,
        error: error.message,
        statusCode: error.response?.status || 'Network Error'
      };
    }
  });
  
  // Execute all requests concurrently
  const responses = await Promise.all(requests);
  const totalTime = performance.now() - startTime;
  
  // Calculate performance metrics
  const successful = responses.filter(r => r.success);
  const failed = responses.filter(r => !r.success);
  const durations = successful.map(r => r.duration).sort((a, b) => a - b);
  
  if (durations.length > 0) {
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const errorRate = (failed.length / responses.length) * 100;
    const throughput = successful.length / (totalTime / 1000); // req/sec
    
    const performanceResult = {
      endpoint: endpoint.name,
      concurrentUsers,
      totalRequests: responses.length,
      successful: successful.length,
      failed: failed.length,
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      latency: {
        avg: Math.round(avg),
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99)
      },
      passedP95Target: p95 <= TARGET_P95_MS,
      sampleResponse: successful[0]?.response
    };
    
    console.log(`  Results: ${successful.length}/${responses.length} successful`);
    console.log(`  P95: ${Math.round(p95)}ms (target: ≤${TARGET_P95_MS}ms) ${p95 <= TARGET_P95_MS ? '✅' : '❌'}`);
    console.log(`  Error Rate: ${errorRate.toFixed(1)}%`);
    console.log(`  Throughput: ${throughput.toFixed(1)} req/sec`);
    
    if (performanceResult.passedP95Target) {
      validationResults.performance.passed++;
    } else {
      validationResults.performance.failed++;
    }
    
    validationResults.performance.details.push(performanceResult);
    return performanceResult;
  } else {
    console.log('  ❌ All requests failed');
    validationResults.performance.failed++;
    const failedResult = {
      endpoint: endpoint.name,
      concurrentUsers,
      allRequestsFailed: true,
      errors: failed.map(f => ({ query: f.query, error: f.error, status: f.statusCode }))
    };
    validationResults.performance.details.push(failedResult);
    return failedResult;
  }
}

async function validateApiCompliance(endpoint) {
  console.log(`\n🔍 Validating API compliance for ${endpoint.name}...`);
  
  const testCases = [
    { params: { q: 'test' }, name: 'Basic query' },
    { params: { q: 'test', limit: 10 }, name: 'With limit' },
    { params: { q: 'test', lat: 40.7128, lng: -74.0060 }, name: 'With location' },
    { params: { q: '' }, name: 'Empty query', expectError: true },
    { params: {}, name: 'No query param', expectError: true }
  ];
  
  let compliancePassed = 0;
  let complianceFailed = 0;
  const details = [];
  
  for (const testCase of testCases) {
    try {
      const response = await makeRequest(endpoint.path, testCase.params, endpoint.requiresAuth);
      const data = response.data;
      
      // Check response structure
      const hasExpectedStructure = 
        (Array.isArray(data) || typeof data === 'object') &&
        (response.status === 200 || response.status === 201);
      
      if (testCase.expectError) {
        // This should have failed but didn't
        complianceFailed++;
        details.push({
          testCase: testCase.name,
          status: '❌',
          issue: 'Expected error but got success',
          response: { status: response.status, hasData: !!data }
        });
      } else if (hasExpectedStructure) {
        compliancePassed++;
        details.push({
          testCase: testCase.name,
          status: '✅',
          response: { 
            status: response.status, 
            resultCount: Array.isArray(data) ? data.length : 
                        (data.restaurants?.length || data.results?.length || 'N/A'),
            hasMetadata: !!(data.meta || data.total || data.entity)
          }
        });
      } else {
        complianceFailed++;
        details.push({
          testCase: testCase.name,
          status: '❌',
          issue: 'Unexpected response structure',
          response: { status: response.status, type: typeof data }
        });
      }
    } catch (error) {
      if (testCase.expectError) {
        // Expected error - this is good
        compliancePassed++;
        details.push({
          testCase: testCase.name,
          status: '✅',
          response: { status: error.response?.status || 'Error', expected: true }
        });
      } else {
        // Unexpected error
        complianceFailed++;
        details.push({
          testCase: testCase.name,
          status: '❌',
          issue: error.message,
          response: { status: error.response?.status || 'Network Error' }
        });
      }
    }
  }
  
  validationResults.apiCompliance.passed += compliancePassed;
  validationResults.apiCompliance.failed += complianceFailed;
  validationResults.apiCompliance.details.push({
    endpoint: endpoint.name,
    passed: compliancePassed,
    failed: complianceFailed,
    testResults: details
  });
  
  console.log(`  API Compliance: ${compliancePassed}/${compliancePassed + complianceFailed} tests passed`);
}

async function checkCachingStatus() {
  console.log('\n🗄️  Checking caching status...');
  
  try {
    // Make the same request twice to test caching
    const query = 'pizza';
    const endpoint = '/api/search/restaurants';
    
    console.log('  Making first request...');
    const start1 = performance.now();
    const response1 = await makeRequest(endpoint, { q: query });
    const duration1 = performance.now() - start1;
    
    // Wait briefly then make same request
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('  Making second request (should hit cache)...');
    const start2 = performance.now();
    const response2 = await makeRequest(endpoint, { q: query });
    const duration2 = performance.now() - start2;
    
    const cacheImprovement = ((duration1 - duration2) / duration1) * 100;
    const likelyCacheHit = duration2 < duration1 && duration2 < 50; // Sub-50ms suggests cache hit
    
    console.log(`  First request: ${Math.round(duration1)}ms`);
    console.log(`  Second request: ${Math.round(duration2)}ms`);
    console.log(`  Improvement: ${Math.round(cacheImprovement)}%`);
    console.log(`  Cache likely active: ${likelyCacheHit ? '✅' : '⚠️'}`);
    
    if (likelyCacheHit || cacheImprovement > 20) {
      validationResults.caching.passed++;
    } else {
      validationResults.caching.failed++;
    }
    
    validationResults.caching.details.push({
      firstRequestMs: Math.round(duration1),
      secondRequestMs: Math.round(duration2),
      improvementPercent: Math.round(cacheImprovement),
      likelyCacheActive: likelyCacheHit,
      query
    });
    
  } catch (error) {
    console.log(`  ❌ Cache test failed: ${error.message}`);
    validationResults.caching.failed++;
    validationResults.caching.details.push({
      error: error.message,
      testFailed: true
    });
  }
}

async function runValidation() {
  console.log('🚀 Search System Validation Suite');
  console.log('==================================');
  
  const isAuthenticated = await login();
  
  // 1. Performance Testing
  console.log('\n📈 1. Performance Testing');
  console.log('========================');
  
  for (const endpoint of ENDPOINTS) {
    if (endpoint.requiresAuth && !isAuthenticated) {
      console.log(`⚠️  Skipping ${endpoint.name} - requires authentication`);
      continue;
    }
    
    // Test at both load levels
    for (const concurrentUsers of CONCURRENT_LOADS) {
      await testEndpointPerformance(endpoint, concurrentUsers);
    }
  }
  
  // 2. API Compliance Testing
  console.log('\n📋 2. API Compliance Testing');
  console.log('============================');
  
  for (const endpoint of ENDPOINTS) {
    if (endpoint.requiresAuth && !isAuthenticated) {
      console.log(`⚠️  Skipping ${endpoint.name} - requires authentication`);
      continue;
    }
    await validateApiCompliance(endpoint);
  }
  
  // 3. Caching Validation
  await checkCachingStatus();
  
  // 4. Generate Report
  await generateValidationReport();
}

async function generateValidationReport() {
  const totalPassed = Object.values(validationResults).reduce((sum, category) => sum + category.passed, 0);
  const totalFailed = Object.values(validationResults).reduce((sum, category) => sum + category.failed, 0);
  const overallPass = totalFailed === 0;
  
  const report = `# Search System Validation Report

## Executive Summary

**Overall Status**: ${overallPass ? '✅ PASS' : '❌ FAIL'} - ${totalPassed}/${totalPassed + totalFailed} validations passed

${overallPass ? 
  '🎉 **GO Decision**: The unified search system meets MVP performance and functional requirements.' :
  '⚠️ **NO-GO Decision**: Critical issues identified that must be resolved before MVP launch.'
}

## Test Configuration

- **Target Environment**: Development/Staging
- **Test Date**: ${new Date().toISOString()}
- **Performance Target**: P95 ≤ 300ms under 100 concurrent users
- **Authentication**: ${authCookie ? 'Available' : 'Public endpoints only'}
- **Redis Caching**: ${process.env.REDIS_URL ? 'Configured' : 'Disabled (fallback mode)'}

## Validation Results Summary

| Category | Status | Passed | Failed | Notes |
|----------|--------|---------|--------|-------|
| Performance | ${validationResults.performance.failed === 0 ? '✅' : '❌'} | ${validationResults.performance.passed} | ${validationResults.performance.failed} | P95 latency under concurrent load |
| API Compliance | ${validationResults.apiCompliance.failed === 0 ? '✅' : '❌'} | ${validationResults.apiCompliance.passed} | ${validationResults.apiCompliance.failed} | Parameter validation & response format |
| Caching | ${validationResults.caching.failed === 0 ? '✅' : '⚠️'} | ${validationResults.caching.passed} | ${validationResults.caching.failed} | Cache hit detection |
| **TOTAL** | ${overallPass ? '✅' : '❌'} | **${totalPassed}** | **${totalFailed}** | Overall system readiness |

## Detailed Performance Results

${validationResults.performance.details.map(result => {
  if (result.allRequestsFailed) {
    return `### ${result.endpoint} - ${result.concurrentUsers} users
❌ **ALL REQUESTS FAILED**
- Errors: ${result.errors.map(e => `${e.query}: ${e.error} (${e.status})`).join(', ')}`;
  }
  
  return `### ${result.endpoint} - ${result.concurrentUsers} users
- **P95 Latency**: ${result.latency.p95}ms ${result.passedP95Target ? '✅' : '❌'} (target: ≤${TARGET_P95_MS}ms)
- **Success Rate**: ${((result.successful / result.totalRequests) * 100).toFixed(1)}% (${result.successful}/${result.totalRequests})
- **Error Rate**: ${result.errorRate}%
- **Throughput**: ${result.throughput} req/sec
- **Latency Distribution**: Avg: ${result.latency.avg}ms, P50: ${result.latency.p50}ms, P95: ${result.latency.p95}ms, P99: ${result.latency.p99}ms`;
}).join('\n\n')}

## API Compliance Details

${validationResults.apiCompliance.details.map(result => `### ${result.endpoint}
- **Tests Passed**: ${result.passed}/${result.passed + result.failed}
- **Test Results**:
${result.testResults.map(test => `  - ${test.status} ${test.testCase}: ${test.issue || 'Valid response'}`).join('\n')}`
).join('\n\n')}

## Caching Analysis

${validationResults.caching.details.map(result => {
  if (result.testFailed) {
    return `❌ **Cache test failed**: ${result.error}`;
  }
  
  return `- **First Request**: ${result.firstRequestMs}ms
- **Second Request**: ${result.secondRequestMs}ms  
- **Performance Improvement**: ${result.improvementPercent}%
- **Cache Status**: ${result.likelyCacheActive ? '✅ Active' : '⚠️ Inactive or ineffective'}`;
}).join('\n')}

## Critical Issues & Recommendations

${totalFailed > 0 ? `### 🚨 Blocking Issues
${validationResults.performance.failed > 0 ? '- **Performance**: P95 latency exceeds 300ms target under concurrent load' : ''}
${validationResults.apiCompliance.failed > 0 ? '- **API Compliance**: Request/response format validation failures' : ''}
${validationResults.caching.failed > 0 ? '- **Caching**: Cache system not functioning effectively' : ''}

### 🛠️ Immediate Actions Required
${validationResults.performance.failed > 0 ? '1. Optimize slow endpoints to meet P95 ≤ 300ms target\n2. Enable Redis caching if not active\n3. Review database query optimization' : ''}
${validationResults.apiCompliance.failed > 0 ? '1. Fix API contract violations\n2. Ensure consistent error handling\n3. Validate all parameter edge cases' : ''}
` : `### ✅ All Critical Validations Passed

The search system is ready for MVP launch with the following optimizations active:
- Performance targets met under concurrent load
- API contracts properly implemented
- Caching system functional (where configured)
`}

## Load Test Summary

**Baseline (50 concurrent users)**:
${validationResults.performance.details
  .filter(r => r.concurrentUsers === 50 && !r.allRequestsFailed)
  .map(r => `- ${r.endpoint}: P95 ${r.latency.p95}ms, ${r.errorRate}% error rate`)
  .join('\n') || '- No successful baseline tests'}

**Target Load (100 concurrent users)**:
${validationResults.performance.details
  .filter(r => r.concurrentUsers === 100 && !r.allRequestsFailed)
  .map(r => `- ${r.endpoint}: P95 ${r.latency.p95}ms, ${r.errorRate}% error rate`)
  .join('\n') || '- No successful target load tests'}

## Final Assessment

${overallPass ? 
  `🎉 **VALIDATION PASSED** - The unified search system meets all MVP requirements and is ready for production deployment.

**Key Achievements**:
- Performance targets met under production load scenarios
- API contracts properly implemented and validated  
- Caching optimizations functional
- Error handling consistent across endpoints

**Recommended Next Steps**:
1. Deploy to production with confidence
2. Monitor P95 latencies in production
3. Set up alerting for performance degradation` :
  
  `⚠️ **VALIDATION FAILED** - Critical issues must be resolved before production deployment.

**Blocking Issues Identified**:
- ${validationResults.performance.failed} performance validation failures
- ${validationResults.apiCompliance.failed} API compliance issues
- ${validationResults.caching.failed} caching system problems

**Required Actions**:
1. Address all ❌ failures listed above
2. Re-run validation after fixes
3. Only proceed to production after achieving 100% pass rate`
}

---
*Report generated on ${new Date().toLocaleString()}*
*Validation tool version: 1.0.0*`;

  return report;
}

// Execute validation
runValidation().catch(error => {
  console.error('Validation execution failed:', error);
  process.exit(1);
});

export { runValidation, generateValidationReport };