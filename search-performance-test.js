#!/usr/bin/env node

/**
 * Comprehensive Search Performance Test for Circles MVP
 * Tests all search APIs under concurrent load to validate MVP readiness
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const AUTH_COOKIE = 'connect.sid=s%3AvQNsCEyQ8MktsswAJvjwdpmA6ci_QxNH.chpXz1SpP99lA9ko%2FjCJ3XxRQsGoxweXX6E0BNzwnHM';

// Test scenarios for comprehensive coverage
const TEST_SCENARIOS = [
  {
    name: 'Restaurant Search - Basic',
    endpoint: '/api/search/restaurants',
    params: { q: 'pizza', limit: 10 },
    expectedFields: ['restaurants'],
    target: '<500ms'
  },
  {
    name: 'Restaurant Search - Location',
    endpoint: '/api/search/restaurants', 
    params: { q: 'sushi', lat: 40.7128, lng: -74.0060, radius: 5000, limit: 10 },
    expectedFields: ['restaurants'],
    target: '<800ms'
  },
  {
    name: 'User Search',
    endpoint: '/api/search/users',
    params: { q: 'test', limit: 10 },
    expectedFields: ['users'],
    target: '<300ms'
  },
  {
    name: 'Unified Search - All',
    endpoint: '/api/search/unified',
    params: { q: 'italian', type: 'all', limit: 20 },
    expectedFields: ['restaurants', 'lists', 'posts', 'users'],
    target: '<1000ms'
  },
  {
    name: 'Unified Search - Restaurants Only',
    endpoint: '/api/search/unified',
    params: { q: 'burger', type: 'restaurants', limit: 10 },
    expectedFields: ['restaurants'],
    target: '<600ms'
  },
  {
    name: 'Trending Tags',
    endpoint: '/api/search/trending-tags',
    params: { limit: 20 },
    expectedFields: ['tags'],
    target: '<200ms'
  },
  {
    name: 'Recent Searches',
    endpoint: '/api/search/recent-searches',
    params: {},
    expectedFields: ['recent', 'suggestions'],
    target: '<100ms'
  },
  {
    name: 'Discovery - For You',
    endpoint: '/api/discover/for-you',
    params: { limit: 10 },
    expectedFields: ['items'],
    target: '<500ms'
  }
];

// Common search queries to test variety
const SEARCH_QUERIES = [
  'pizza', 'sushi', 'burger', 'italian', 'chinese', 'mexican',
  'coffee', 'dessert', 'brunch', 'fine dining'
];

class SearchPerformanceTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      totalTests: 0,
      scenarios: [],
      loadTest: null,
      summary: {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        errorRate: 0
      }
    };
  }

  async makeRequest(endpoint, params = {}) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        params,
        headers: {
          'Cookie': AUTH_COOKIE,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        data: response.data,
        responseTime,
        status: response.status,
        error: null
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: false,
        data: null,
        responseTime,
        status: error.response?.status || 0,
        error: error.message || 'Unknown error'
      };
    }
  }

  validateResponse(data, expectedFields, scenarioName) {
    const issues = [];
    
    if (!data || typeof data !== 'object') {
      issues.push('Response is not a valid object');
      return issues;
    }

    // Check required fields
    for (const field of expectedFields) {
      if (!(field in data)) {
        issues.push(`Missing required field: ${field}`);
      } else if (Array.isArray(data[field])) {
        // For array fields, check if they have reasonable structure
        if (field === 'restaurants') {
          data[field].forEach((item, index) => {
            if (!item.id || !item.name) {
              issues.push(`Restaurant ${index} missing id or name`);
            }
          });
        } else if (field === 'users') {
          data[field].forEach((item, index) => {
            if (!item.id || !item.username) {
              issues.push(`User ${index} missing id or username`);
            }
          });
        }
      }
    }

    return issues;
  }

  async runSingleScenario(scenario) {
    console.log(`\n🔍 Testing: ${scenario.name}`);
    
    const result = await this.makeRequest(scenario.endpoint, scenario.params);
    const issues = [];
    
    if (!result.success) {
      issues.push(`Request failed: ${result.error}`);
    } else {
      const validationIssues = this.validateResponse(result.data, scenario.expectedFields, scenario.name);
      issues.push(...validationIssues);
    }
    
    // Parse target time (remove '<' and 'ms')
    const targetTime = parseInt(scenario.target.replace('<', '').replace('ms', ''));
    const performanceIssue = result.responseTime > targetTime;
    
    if (performanceIssue) {
      issues.push(`Performance: ${result.responseTime}ms > target ${scenario.target}`);
    }
    
    const passed = issues.length === 0;
    
    console.log(`  Status: ${result.status}`);
    console.log(`  Response Time: ${result.responseTime}ms (target: ${scenario.target})`);
    console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (issues.length > 0) {
      console.log(`  Issues: ${issues.join(', ')}`);
    }

    return {
      scenario: scenario.name,
      passed,
      responseTime: result.responseTime,
      status: result.status,
      issues: issues,
      target: scenario.target,
      data: result.success ? result.data : null
    };
  }

  async runLoadTest() {
    console.log('\n🚀 Running Load Test (50 concurrent requests)...');
    
    const concurrentRequests = 50;
    const testQueries = SEARCH_QUERIES.slice(0, 10);
    const promises = [];
    
    // Create concurrent requests using different queries
    for (let i = 0; i < concurrentRequests; i++) {
      const query = testQueries[i % testQueries.length];
      promises.push(this.makeRequest('/api/search/restaurants', { q: query, limit: 5 }));
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const responseTimes = results.map(r => r.responseTime);
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const errorRate = (failed / concurrentRequests) * 100;
    
    const loadTestResults = {
      totalRequests: concurrentRequests,
      successful,
      failed,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      minResponseTime,
      totalDuration: endTime - startTime,
      throughput: Math.round((concurrentRequests / (endTime - startTime)) * 1000)
    };
    
    console.log(`  Total Requests: ${loadTestResults.totalRequests}`);
    console.log(`  Successful: ${loadTestResults.successful}`);
    console.log(`  Failed: ${loadTestResults.failed}`);
    console.log(`  Error Rate: ${loadTestResults.errorRate}%`);
    console.log(`  Avg Response Time: ${loadTestResults.avgResponseTime}ms`);
    console.log(`  Max Response Time: ${loadTestResults.maxResponseTime}ms`);
    console.log(`  Min Response Time: ${loadTestResults.minResponseTime}ms`);
    console.log(`  Throughput: ${loadTestResults.throughput} requests/sec`);
    
    return loadTestResults;
  }

  async runFullAudit() {
    console.log('🔍 CIRCLES SEARCH FUNCTIONALITY AUDIT');
    console.log('=====================================');
    console.log('Testing all search APIs for MVP readiness...\n');
    
    // Run individual scenarios
    for (const scenario of TEST_SCENARIOS) {
      const result = await this.runSingleScenario(scenario);
      this.results.scenarios.push(result);
      this.results.totalTests++;
      
      if (result.passed) {
        this.results.passed++;
      } else {
        this.results.failed++;
      }
    }
    
    // Run load test
    this.results.loadTest = await this.runLoadTest();
    
    // Calculate summary
    const responseTimes = this.results.scenarios.map(s => s.responseTime);
    this.results.summary.avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    this.results.summary.maxResponseTime = Math.max(...responseTimes);
    this.results.summary.minResponseTime = Math.min(...responseTimes);
    this.results.summary.errorRate = Math.round((this.results.failed / this.results.totalTests) * 100);
    
    // Generate report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 AUDIT SUMMARY');
    console.log('=================');
    console.log(`Tests Passed: ${this.results.passed}/${this.results.totalTests} (${Math.round((this.results.passed/this.results.totalTests)*100)}%)`);
    console.log(`Average Response Time: ${this.results.summary.avgResponseTime}ms`);
    console.log(`Max Response Time: ${this.results.summary.maxResponseTime}ms`);
    console.log(`Error Rate: ${this.results.summary.errorRate}%`);
    
    console.log('\n🎯 MVP READINESS ASSESSMENT:');
    
    const passRate = (this.results.passed / this.results.totalTests) * 100;
    const avgResponseOK = this.results.summary.avgResponseTime < 1000;
    const errorRateOK = this.results.summary.errorRate < 10;
    const loadTestOK = this.results.loadTest.errorRate < 20 && this.results.loadTest.avgResponseTime < 2000;
    
    console.log(`  ✅ Pass Rate: ${passRate >= 85 ? 'GOOD' : 'NEEDS IMPROVEMENT'} (${Math.round(passRate)}%)`);
    console.log(`  ✅ Response Time: ${avgResponseOK ? 'GOOD' : 'NEEDS OPTIMIZATION'} (${this.results.summary.avgResponseTime}ms avg)`);
    console.log(`  ✅ Error Rate: ${errorRateOK ? 'GOOD' : 'NEEDS IMPROVEMENT'} (${this.results.summary.errorRate}%)`);
    console.log(`  ✅ Load Capacity: ${loadTestOK ? 'GOOD' : 'NEEDS IMPROVEMENT'} (${this.results.loadTest.errorRate}% error rate under load)`);
    
    const overallReady = passRate >= 85 && avgResponseOK && errorRateOK && loadTestOK;
    
    console.log(`\n🚀 OVERALL MVP STATUS: ${overallReady ? '✅ READY FOR DEPLOYMENT' : '⚠️ NEEDS IMPROVEMENT'}`);
    
    if (!overallReady) {
      console.log('\n🔧 RECOMMENDATIONS:');
      if (passRate < 85) {
        console.log('  - Fix failing search APIs');
      }
      if (!avgResponseOK) {
        console.log('  - Optimize search performance (add caching, database indexes)');
      }
      if (!errorRateOK) {
        console.log('  - Investigate and fix error sources');
      }
      if (!loadTestOK) {
        console.log('  - Improve server capacity and database optimization');
      }
    }
  }
}

// Run the audit
const audit = new SearchPerformanceTest();
audit.runFullAudit().catch(console.error);