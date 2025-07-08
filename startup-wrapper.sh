#!/bin/bash

# Circles Application Startup Wrapper
# Handles Node.js environment configuration and server startup

set -e

echo "Starting Circles - Food Experience Sharing Platform"
echo "=================================================="

# Function to find Node.js in system
find_nodejs() {
    local node_paths=(
        "/nix/store/0akvkk9k1a7z5vjp34yz6dr91j776jhv-nodejs-20.11.1/bin"
        "/usr/bin"
        "/usr/local/bin"
    )
    
    for path in "${node_paths[@]}"; do
        if [ -f "$path/node" ] && [ -x "$path/node" ]; then
            echo "Found Node.js at: $path"
            export PATH="$path:$PATH"
            return 0
        fi
    done
    
    # Search in nix store
    for nodejs_path in /nix/store/*nodejs*/bin; do
        if [ -f "$nodejs_path/node" ] && [ -x "$nodejs_path/node" ]; then
            echo "Found Node.js in Nix store: $nodejs_path"
            export PATH="$nodejs_path:$PATH"
            return 0
        fi
    done
    
    echo "Node.js not found in system"
    return 1
}

# Configure environment
configure_environment() {
    export NODE_ENV=development
    export PORT=5000
    
    # Set database URL
    if [ -n "$DATABASE_URL" ]; then
        echo "Using provided DATABASE_URL"
    else
        echo "Setting default DATABASE_URL"
        export DATABASE_URL="postgresql://localhost:5432/circles"
    fi
    
    echo "Node.js: $(node --version)"
    echo "NPM: $(npm --version)"
    echo "Database: $DATABASE_URL"
    echo "Environment: $NODE_ENV"
}

# Start application
start_application() {
    echo ""
    echo "Starting Circles development server..."
    echo "Server will be available at: http://localhost:5000"
    echo ""
    
    # Clean up any existing processes
    pkill -f "tsx server/index.ts" 2>/dev/null || true
    
    # Start the server
    exec npm run dev
}

# Main execution
main() {
    if find_nodejs; then
        configure_environment
        start_application
    else
        echo "Failed to locate Node.js installation"
        exit 1
    fi
}

# Run main function
main "$@"