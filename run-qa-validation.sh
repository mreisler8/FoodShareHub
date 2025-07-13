#!/bin/bash

# Comprehensive QA Validation Script for Circles Application
echo "🧪 Running Comprehensive QA Test Suite for Circles"
echo "================================================="

# Set up Node.js environment
export PATH="/nix/store/0akvkk9k1a7z5vjp34yz6dr91j776jhv-nodejs-20.11.1/bin:$PATH"
export NODE_ENV=test

# Database setup
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set, using default PostgreSQL connection"
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/circles"
fi

# Verify environment
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Function to run tests with proper environment
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    echo "🔍 Running: $test_name"
    echo "▶️  Command: $test_command"
    echo "---"
    
    if eval "$test_command"; then
        echo "✅ PASSED: $test_name"
        return 0
    else
        echo "❌ FAILED: $test_name"
        return 1
    fi
}

# Start server in background for testing
echo "🚀 Starting test server..."
echo "📊 Using database: $DATABASE_URL"
NODE_ENV=development DATABASE_URL="$DATABASE_URL" ./node_modules/.bin/tsx server/index.ts &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Verify server is running
if ! curl -s http://localhost:5000/api/me > /dev/null; then
    echo "❌ Server failed to start"
    exit 1
fi

echo "✅ Server started successfully"

# Run comprehensive test suite
echo ""
echo "🧪 STARTING COMPREHENSIVE QA TEST SUITE"
echo "========================================"

# Initialize results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: Jest Unit Tests
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Jest Unit Tests" "npm test"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 2: API Tests
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "API Test Suite" "node test-runner.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 3: Smoke Tests
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Smoke Tests" "node run-smoke-test.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 4: Manual QA Tests
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Manual QA Tests" "node qa-manual-test.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 5: Feed Tests
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Feed Tests" "node test-feed.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 6: QA Framework Validation
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "QA Framework Validation" "node validate-qa-framework.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Stop server
echo ""
echo "🛑 Stopping test server..."
kill $SERVER_PID 2>/dev/null || true

# Generate test report
echo ""
echo "📊 QA TEST SUMMARY"
echo "=================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED! Circles application is ready for production."
    exit 0
else
    echo ""
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi