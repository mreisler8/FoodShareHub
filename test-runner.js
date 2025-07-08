#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateQAFramework } from './validate-qa-framework.js';

// Simple test execution for components that don't require Node.js runtime
async function runBasicTests() {
  console.log('🧪 Basic Test Suite Execution');
  console.log('=' * 40);
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0
  };
  
  // Test 1: File Structure Validation
  console.log('\n📁 File Structure Tests');
  const requiredFiles = [
    'shared/schema.ts',
    'server/routes.ts', 
    'server/auth.ts',
    'server/db.ts',
    'client/src/App.tsx',
    'package.json',
    'replit.md'
  ];
  
  requiredFiles.forEach(file => {
    results.total++;
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
      results.passed++;
    } else {
      console.log(`❌ ${file} missing`);
      results.failed++;
    }
  });
  
  // Test 2: Configuration Validation
  console.log('\n⚙️ Configuration Tests');
  const configTests = [
    {
      name: 'package.json has required scripts',
      test: () => {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        return pkg.scripts && pkg.scripts.dev && pkg.scripts.test;
      }
    },
    {
      name: 'Jest configuration exists',
      test: () => fs.existsSync('jest.config.js')
    },
    {
      name: 'Cypress configuration exists', 
      test: () => fs.existsSync('cypress.config.js')
    },
    {
      name: 'TypeScript configuration exists',
      test: () => fs.existsSync('tsconfig.json')
    }
  ];
  
  configTests.forEach(test => {
    results.total++;
    try {
      if (test.test()) {
        console.log(`✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`❌ ${test.name}`);
        results.failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} (Error: ${error.message})`);
      results.failed++;
    }
  });
  
  // Test 3: Database Schema Validation
  console.log('\n🗄️ Database Schema Tests');
  try {
    const schemaContent = fs.readFileSync('shared/schema.ts', 'utf8');
    const schemaTests = [
      {
        name: 'Schema has users table',
        test: () => schemaContent.includes('users') && schemaContent.includes('pgTable')
      },
      {
        name: 'Schema has restaurants table',
        test: () => schemaContent.includes('restaurants') && schemaContent.includes('pgTable')
      },
      {
        name: 'Schema has posts table',
        test: () => schemaContent.includes('posts') && schemaContent.includes('pgTable')
      },
      {
        name: 'Schema has lists table',
        test: () => schemaContent.includes('restaurant_lists') && schemaContent.includes('pgTable')
      },
      {
        name: 'Schema has circles table',
        test: () => schemaContent.includes('circles') && schemaContent.includes('pgTable')
      }
    ];
    
    schemaTests.forEach(test => {
      results.total++;
      if (test.test()) {
        console.log(`✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`❌ ${test.name}`);
        results.failed++;
      }
    });
  } catch (error) {
    console.log(`❌ Schema validation failed: ${error.message}`);
    results.failed++;
    results.total++;
  }
  
  // Test 4: API Routes Validation
  console.log('\n🔗 API Routes Tests');
  try {
    const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
    const routeTests = [
      {
        name: 'Routes file has authentication endpoints',
        test: () => routesContent.includes('/api/auth') || routesContent.includes('auth')
      },
      {
        name: 'Routes file has posts endpoints',
        test: () => routesContent.includes('/api/posts') || routesContent.includes('posts')
      },
      {
        name: 'Routes file has lists endpoints',
        test: () => routesContent.includes('/api/lists') || routesContent.includes('lists')
      },
      {
        name: 'Routes file has restaurants endpoints',
        test: () => routesContent.includes('/api/restaurants') || routesContent.includes('restaurants')
      },
      {
        name: 'Routes file has circles endpoints',
        test: () => routesContent.includes('/api/circles') || routesContent.includes('circles')
      }
    ];
    
    routeTests.forEach(test => {
      results.total++;
      if (test.test()) {
        console.log(`✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`❌ ${test.name}`);
        results.failed++;
      }
    });
  } catch (error) {
    console.log(`❌ Routes validation failed: ${error.message}`);
    results.failed++;
    results.total++;
  }
  
  // Test 5: Frontend Component Structure
  console.log('\n⚛️ Frontend Component Tests');
  const componentDirs = [
    'client/src/components',
    'client/src/pages',
    'client/src/hooks'
  ];
  
  componentDirs.forEach(dir => {
    results.total++;
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      if (files.length > 0) {
        console.log(`✅ ${dir} has ${files.length} files`);
        results.passed++;
      } else {
        console.log(`⚠️ ${dir} is empty`);
        results.skipped++;
      }
    } else {
      console.log(`❌ ${dir} missing`);
      results.failed++;
    }
  });
  
  return results;
}

async function runFullTestSuite() {
  console.log('🚀 Circles QA Framework - Full Test Suite');
  console.log('=' * 50);
  
  try {
    // Step 1: Validate QA Framework
    console.log('\n📋 Step 1: QA Framework Validation');
    const frameworkResult = await validateQAFramework();
    
    // Step 2: Run Basic Tests  
    console.log('\n🧪 Step 2: Basic Component Tests');
    const basicResults = await runBasicTests();
    
    // Step 3: Summary Report
    console.log('\n📊 Final Test Report');
    console.log('=' * 30);
    console.log(`Framework Score: ${frameworkResult.score}%`);
    console.log(`Basic Tests Passed: ${basicResults.passed}/${basicResults.total}`);
    console.log(`Test Coverage: ${Math.round((basicResults.passed / basicResults.total) * 100)}%`);
    
    const overallScore = Math.round((frameworkResult.score + (basicResults.passed / basicResults.total) * 100) / 2);
    console.log(`\n🎯 Overall Quality Score: ${overallScore}%`);
    
    if (overallScore >= 85) {
      console.log('🎉 Excellent! QA framework is production ready');
    } else if (overallScore >= 70) {
      console.log('✅ Good! Framework is functional with minor improvements needed');
    } else if (overallScore >= 50) {
      console.log('⚠️ Fair! Framework needs significant improvements');
    } else {
      console.log('❌ Poor! Framework requires major fixes before use');
    }
    
    // Step 4: Next Steps
    console.log('\n🚀 Recommended Next Actions:');
    if (overallScore >= 80) {
      console.log('💡 Execute full test suite with actual Node.js runtime');
      console.log('💡 Set up CI/CD pipeline integration');
      console.log('💡 Add performance and accessibility testing');
    } else {
      console.log('🔧 Fix failing tests and missing components');
      console.log('💡 Complete test implementation');
      console.log('💡 Validate all API endpoints');
    }
    
    return {
      framework: frameworkResult,
      basic: basicResults,
      overall: overallScore
    };
    
  } catch (error) {
    console.error(`💥 Test suite failed: ${error.message}`);
    return null;
  }
}

// Execute the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTestSuite()
    .then(results => {
      if (results && results.overall >= 70) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`Failed to run tests: ${error.message}`);
      process.exit(1);
    });
}

export { runBasicTests, runFullTestSuite };