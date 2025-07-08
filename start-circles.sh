#!/bin/bash

# Official Circles Application Startup Script
export PATH="/nix/store/0akvkk9k1a7z5vjp34yz6dr91j776jhv-nodejs-20.11.1/bin:$PATH"
export NODE_ENV=development

# Source environment variables
if [ -f ".env" ]; then
    source .env
fi

# Set default DATABASE_URL if not provided
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://localhost:5432/circles"
fi

# Run the application
echo "🚀 Starting Circles - Food Experience Sharing Platform"
echo "Node.js: $(node --version)"
echo "Environment: $NODE_ENV"
echo "Port: ${PORT:-5000}"
echo ""

npm run dev