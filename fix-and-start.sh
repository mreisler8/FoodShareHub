#!/bin/bash

# Comprehensive fix for Circles application startup
echo "🔧 Fixing and Starting Circles Application"
echo "=========================================="

# Set up Node.js environment
export PATH="/nix/store/0akvkk9k1a7z5vjp34yz6dr91j776jhv-nodejs-20.11.1/bin:$PATH"
export NODE_ENV=development

# Verify Node.js is working
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Clean up any existing processes
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

# Check database connection
echo "🔍 Checking database connection..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL not set, using default"
    export DATABASE_URL="postgresql://localhost:5432/circles"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting Circles development server..."
echo "🌐 Server will be available at: http://localhost:5000"
echo "📊 Database: $DATABASE_URL"
echo ""

# Run the server
npm run dev