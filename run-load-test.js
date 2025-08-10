#!/usr/bin/env node

/**
 * SIMPLIFIED LOAD TEST FOR MVP PERFORMANCE VALIDATION
 * Target: P95 ≤ 300ms under 100 concurrent users
 */

import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000';
const AUTH_COOKIE = 'connect.sid=s%3AvQNsCEyQ8MktsswAJvjwdpmA6ci_QxNH.chpXz1SpP99lA9ko%2FjCJ3XxRQsGoxweXX6E0BNzwnHM';
const TARGET_P95_MS = 300;

const endpoints = [
  '/api/search/restaurants?q=pizza',
  '/api/search/restaurants?q=italian', 
  '/api/search/users?q=test',
  '/api/search/unified?q=food',
  '/api/search/unified?q=restaurant'
];

async function makeRequest(url) {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': AUTH_COOKIE
      }
    });
    
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    return {
      ok: response.ok,
      status: response.status, 
      latency,
      size: response.headers.get('content-length') || 0
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      ok: false,
      status: 0,
      latency: endTime - startTime,
      error: error.message
    };
  }
}

async function runConcurrentTest(endpoint, concurrency = 50, requestsPerUser = 5) {
  console.log(`🚀 Testing ${endpoint} with ${concurrency} concurrent users (${requestsPerUser} req each)`);
  
  const latencies = [];
  const errors = [];
  const startTime = performance.now();
  
  // Create concurrent promises
  const promises = [];
  for (let user = 0; user < concurrency; user++) {
    for (let req = 0; req < requestsPerUser; req++) {
      promises.push(makeRequest(`${BASE_URL}${endpoint}`));
    }
  }
  
  // Execute all requests concurrently
  const results = await Promise.all(promises);
  const endTime = performance.now();
  
  // Process results
  results.forEach(result => {
    latencies.push(result.latency);
    if (!result.ok) {
      errors.push(result);
    }
  });
  
  // Calculate statistics
  const sortedLatencies = latencies.sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  
  const totalTime = endTime - startTime;
  const throughput = (results.length / totalTime) * 1000; // req/s
  const errorRate = (errors.length / results.length) * 100;
  
  return {
    endpoint,
    concurrency,
    totalRequests: results.length,
    errors: errors.length,
    errorRate: `${errorRate.toFixed(2)}%`,
    duration: `${(totalTime/1000).toFixed(2)}s`,
    throughput: `${throughput.toFixed(2)} req/s`,
    latencies: {
      p50: `${p50.toFixed(2)}ms`,
      p95: `${p95.toFixed(2)}ms`, 
      p99: `${p99.toFixed(2)}ms`,
      avg: `${avg.toFixed(2)}ms`,
      min: `${min.toFixed(2)}ms`,
      max: `${max.toFixed(2)}ms`
    },
    p95Raw: p95,
    errorRateRaw: errorRate,
    pass: p95 <= TARGET_P95_MS && errorRate <= 1.0
  };
}

async function main() {
  console.log('🎯 CIRCLES MVP PERFORMANCE VALIDATION');
  console.log(`Target: P95 ≤ ${TARGET_P95_MS}ms, Error Rate ≤ 1%\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await runConcurrentTest(endpoint, 50, 4); // 200 total requests per endpoint
      results.push(result);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error testing ${endpoint}:`, error.message);
      results.push({
        endpoint,
        error: error.message,
        pass: false
      });
    }
  }
  
  // Generate Report
  console.log('\n📋 PERFORMANCE VALIDATION REPORT');
  console.log('=' .repeat(80));
  
  let overallPass = true;
  
  results.forEach(result => {
    if (result.error) {
      console.log(`\n❌ ${result.endpoint}: ERROR - ${result.error}`);
      overallPass = false;
      return;
    }
    
    console.log(`\n🔍 ${result.endpoint}`);
    console.log(`  Requests: ${result.totalRequests} | Errors: ${result.errors} (${result.errorRate})`);
    console.log(`  Duration: ${result.duration} | Throughput: ${result.throughput}`);
    console.log(`  Latencies: P50=${result.latencies.p50} | P95=${result.latencies.p95} | P99=${result.latencies.p99}`);
    console.log(`  Range: ${result.latencies.min} - ${result.latencies.max} | Avg: ${result.latencies.avg}`);
    console.log(`  Status: ${result.pass ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!result.pass) {
      overallPass = false;
    }
  });
  
  // Summary Table
  console.log('\n📊 SUMMARY TABLE');
  console.log('=' .repeat(90));
  console.log('| Endpoint'.padEnd(35) + '| P95'.padEnd(12) + '| Error%'.padEnd(10) + '| RPS'.padEnd(10) + '| Status'.padEnd(8) + '|');
  console.log('|' + '-'.repeat(88) + '|');
  
  results.forEach(result => {
    if (result.error) {
      const endpoint = result.endpoint.substring(0, 32).padEnd(34);
      console.log(`| ${endpoint}| ERROR      | -        | -        | ❌ FAIL|`);
      return;
    }
    
    const endpoint = result.endpoint.substring(0, 32).padEnd(34);
    const p95 = `${result.p95Raw?.toFixed(1)}ms`.padEnd(11);
    const errorRate = `${result.errorRateRaw?.toFixed(1)}%`.padEnd(9);
    const rps = result.throughput.padEnd(9);
    const status = (result.pass ? '✅ PASS' : '❌ FAIL').padEnd(7);
    
    console.log(`| ${endpoint}| ${p95}| ${errorRate}| ${rps}| ${status}|`);
  });
  
  console.log('\n🎯 MVP READINESS ASSESSMENT');
  console.log('=' .repeat(50));
  console.log(`Target: P95 ≤ ${TARGET_P95_MS}ms, Error Rate ≤ 1%`);
  console.log(`Status: ${overallPass ? '✅ GO - MVP READY' : '❌ NO-GO - NEEDS OPTIMIZATION'}`);
  
  if (!overallPass) {
    console.log('\n🔧 BOTTLENECKS DETECTED:');
    results.forEach(result => {
      if (!result.pass && !result.error) {
        console.log(`  - ${result.endpoint}: P95=${result.p95Raw?.toFixed(1)}ms, Errors=${result.errorRateRaw?.toFixed(1)}%`);
      }
    });
  }
  
  console.log('\n✨ Performance validation complete!');
  return { overallPass, results };
}

main().catch(console.error);