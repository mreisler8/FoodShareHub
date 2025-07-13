#!/bin/bash

# Set up Node.js environment for Circles application
echo "🚀 Setting up Circles Development Environment"
echo "============================================="

# Find Node.js in the system
NODE_PATH=""
for path in /nix/store/*nodejs*/bin/node; do
    if [ -f "$path" ] && [ -x "$path" ]; then
        NODE_PATH="$path"
        break
    fi
done

if [ -z "$NODE_PATH" ]; then
    echo "❌ Node.js not found in system"
    exit 1
fi

# Set up environment
export PATH="$(dirname "$NODE_PATH"):$PATH"
export NODE_ENV=development

echo "✅ Node.js found at: $NODE_PATH"
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🔄 Starting Circles development server..."
echo "🌐 Server will be available at: http://localhost:5000"
echo ""

# Run the development server
exec npm run dev