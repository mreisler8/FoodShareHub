#!/bin/bash

# Comprehensive QA Test Suite for Circles Application
echo "🧪 Running Comprehensive QA Test Suite for Circles"
echo "================================================="

# Set up Node.js environment
export PATH="/nix/store/0akvkk9k1a7z5vjp34yz6dr91j776jhv-nodejs-20.11.1/bin:$PATH"
export NODE_ENV=test

# Set up database environment
if [ -n "$DATABASE_URL" ]; then
    echo "✅ Using provided DATABASE_URL"
else
    echo "⚠️  DATABASE_URL not found, using local PostgreSQL"
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/circles"
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"
echo "📊 Database: $DATABASE_URL"

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    echo "🔍 Running: $test_name"
    echo "---"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo "✅ PASSED: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAILED: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Start server in background
echo ""
echo "🚀 Starting test server..."
DATABASE_URL="$DATABASE_URL" NODE_ENV=development ./node_modules/.bin/tsx server/index.ts &
SERVER_PID=$!

# Wait for server startup
sleep 5

# Verify server is running
if curl -s http://localhost:5000/api/me > /dev/null; then
    echo "✅ Server started successfully"
else
    echo "❌ Server failed to start, running tests without server"
    kill $SERVER_PID 2>/dev/null || true
    SERVER_PID=""
fi

echo ""
echo "🧪 STARTING COMPREHENSIVE QA TEST SUITE"
echo "========================================"

# Run all test suites
run_test "QA Framework Validation" "node validate-qa-framework.js"
run_test "Smoke Tests" "node run-smoke-test.js"
run_test "Feed Tests" "node test-feed.js"
run_test "Test Runner" "node test-runner.js"
run_test "Manual QA Tests" "node qa-manual-test.js"

# Try to run Jest tests
if [ -f "jest.config.js" ]; then
    run_test "Jest Unit Tests" "npm test"
fi

# Stop server if running
if [ -n "$SERVER_PID" ]; then
    echo ""
    echo "🛑 Stopping test server..."
    kill $SERVER_PID 2>/dev/null || true
fi

# Generate final report
echo ""
echo "📊 FINAL QA TEST REPORT"
echo "======================="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    echo "Success Rate: ${SUCCESS_RATE}%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo ""
        echo "🎉 ALL TESTS PASSED! Circles application is ready for production."
        exit 0
    else
        echo ""
        echo "⚠️  Some tests failed. Please review the output above."
        exit 1
    fi
else
    echo ""
    echo "⚠️  No tests were executed."
    exit 1
fi