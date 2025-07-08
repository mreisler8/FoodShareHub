#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkDirectoryContents(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

function validateTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic validation checks
    const checks = {
      hasDescribe: content.includes('describe('),
      hasIt: content.includes('it(') || content.includes('test('),
      hasExpect: content.includes('expect('),
      hasImports: content.includes('import ') || content.includes('require('),
      hasBasicStructure: content.length > 100
    };
    
    return checks;
  } catch (error) {
    return { error: error.message };
  }
}

async function validateQAFramework() {
  log('🔍 QA Framework Validation Report', 'bold');
  log('=' * 50, 'blue');
  
  let totalTests = 0;
  let validTests = 0;
  let warnings = [];
  let errors = [];
  
  // 1. Check QA Plan Documentation
  log('\n📋 Documentation Validation', 'yellow');
  const qaPlanPath = 'docs/QA_PLAN.md';
  if (checkFileExists(qaPlanPath)) {
    log('✅ QA Plan documentation exists', 'green');
    const content = fs.readFileSync(qaPlanPath, 'utf8');
    if (content.includes('97 total test cases')) {
      log('✅ QA Plan contains expected test case count', 'green');
    } else {
      warnings.push('QA Plan may not contain expected test case count');
    }
  } else {
    errors.push('QA Plan documentation missing');
  }
  
  // 2. Check Cypress E2E Test Structure
  log('\n🔄 Cypress E2E Tests Validation', 'yellow');
  const cypressTestDirs = [
    'cypress/integration/core-flows',
    'cypress/integration/persona-flows', 
    'cypress/integration/quality-gates'
  ];
  
  let cypressTestCount = 0;
  cypressTestDirs.forEach(dir => {
    const files = checkDirectoryContents(dir);
    const testFiles = files.filter(f => f.endsWith('.spec.js') || f.endsWith('.test.js'));
    cypressTestCount += testFiles.length;
    
    if (testFiles.length > 0) {
      log(`✅ ${dir}: ${testFiles.length} test files`, 'green');
    } else {
      warnings.push(`${dir}: No test files found`);
    }
  });
  
  totalTests += cypressTestCount;
  log(`📊 Total Cypress tests: ${cypressTestCount}`, 'blue');
  
  // 3. Check API Test Suite
  log('\n🔗 API Tests Validation', 'yellow');
  const apiTestDir = 'tests/api';
  const apiTestFiles = checkDirectoryContents(apiTestDir);
  const validApiTests = apiTestFiles.filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js'));
  
  totalTests += validApiTests.length;
  log(`✅ API test files: ${validApiTests.length}`, 'green');
  
  // Validate a few API test files
  validApiTests.slice(0, 3).forEach(file => {
    const validation = validateTestFile(path.join(apiTestDir, file));
    if (validation.error) {
      errors.push(`API test ${file}: ${validation.error}`);
    } else if (validation.hasDescribe && validation.hasIt && validation.hasExpect) {
      validTests++;
      log(`✅ ${file}: Valid test structure`, 'green');
    } else {
      warnings.push(`${file}: Incomplete test structure`);
    }
  });
  
  // 4. Check Unit Test Framework
  log('\n🧪 Unit Tests Validation', 'yellow');
  const unitTestDirs = [
    'tests/unit/components',
    'tests/unit/services'
  ];
  
  let unitTestCount = 0;
  unitTestDirs.forEach(dir => {
    const files = checkDirectoryContents(dir);
    const testFiles = files.filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js'));
    unitTestCount += testFiles.length;
    
    if (testFiles.length > 0) {
      log(`✅ ${dir}: ${testFiles.length} test files`, 'green');
    } else {
      warnings.push(`${dir}: No test files found`);
    }
  });
  
  totalTests += unitTestCount;
  log(`📊 Total Unit tests: ${unitTestCount}`, 'blue');
  
  // 5. Check Test Configuration Files
  log('\n⚙️ Configuration Validation', 'yellow');
  const configFiles = [
    'jest.config.js',
    'cypress.config.js',
    'playwright.config.ts'
  ];
  
  configFiles.forEach(file => {
    if (checkFileExists(file)) {
      log(`✅ ${file} exists`, 'green');
    } else {
      warnings.push(`${file} missing`);
    }
  });
  
  // 6. Check Package Dependencies
  log('\n📦 Dependencies Validation', 'yellow');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const testDependencies = [
      'jest',
      'cypress', 
      '@testing-library/react',
      '@testing-library/jest-dom',
      'supertest'
    ];
    
    const devDeps = packageJson.devDependencies || {};
    const deps = packageJson.dependencies || {};
    
    testDependencies.forEach(dep => {
      if (deps[dep] || devDeps[dep]) {
        log(`✅ ${dep} dependency found`, 'green');
      } else {
        warnings.push(`${dep} dependency missing`);
      }
    });
  } catch (error) {
    errors.push('Cannot read package.json');
  }
  
  // 7. Final Report
  log('\n📊 Summary Report', 'bold');
  log('=' * 30, 'blue');
  log(`Total test files found: ${totalTests}`, 'blue');
  log(`Valid test structures: ${validTests}`, 'green');
  log(`Warnings: ${warnings.length}`, 'yellow');
  log(`Errors: ${errors.length}`, errors.length > 0 ? 'red' : 'green');
  
  if (warnings.length > 0) {
    log('\n⚠️ Warnings:', 'yellow');
    warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
  }
  
  if (errors.length > 0) {
    log('\n❌ Errors:', 'red');
    errors.forEach(error => log(`  - ${error}`, 'red'));
  }
  
  // 8. Test Infrastructure Status
  log('\n🏗️ Infrastructure Status', 'bold');
  const infrastructureScore = Math.round(((totalTests + validTests) / (totalTests + validTests + warnings.length + errors.length)) * 100);
  
  if (infrastructureScore >= 80) {
    log(`✅ QA Framework: ${infrastructureScore}% Complete (Excellent)`, 'green');
  } else if (infrastructureScore >= 60) {
    log(`⚠️ QA Framework: ${infrastructureScore}% Complete (Good)`, 'yellow');
  } else {
    log(`❌ QA Framework: ${infrastructureScore}% Complete (Needs Work)`, 'red');
  }
  
  // 9. Next Steps Recommendations
  log('\n🚀 Recommended Next Steps:', 'bold');
  if (errors.length === 0 && warnings.length < 3) {
    log('✅ Framework ready for test execution', 'green');
    log('💡 Run individual test suites to validate functionality', 'blue');
    log('💡 Set up CI/CD integration for automated testing', 'blue');
  } else if (errors.length > 0) {
    log('🔧 Fix critical errors before proceeding', 'red');
    log('💡 Address missing files and dependencies', 'yellow');
  } else {
    log('🔧 Address warnings to improve framework completeness', 'yellow');
    log('💡 Framework is functional but could be enhanced', 'blue');
  }
  
  return {
    totalTests,
    validTests,
    warnings: warnings.length,
    errors: errors.length,
    score: infrastructureScore
  };
}

// Run the validation
if (require.main === module) {
  validateQAFramework()
    .then(result => {
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      log(`💥 Validation failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { validateQAFramework };