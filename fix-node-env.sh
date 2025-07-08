#!/bin/bash

# Find and configure Node.js environment
echo "Configuring Node.js environment for Circles..."

# Find Node.js in system
NODE_PATH=""
for path in /nix/store/*/bin/node; do
    if [ -f "$path" ] && [ -x "$path" ]; then
        NODE_PATH="$path"
        break
    fi
done

if [ -z "$NODE_PATH" ]; then
    echo "Node.js not found"
    exit 1
fi

# Set environment
export PATH="$(dirname "$NODE_PATH"):$PATH"
export NODE_ENV=development
export DATABASE_URL="postgresql://localhost:5432/circles"

echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"

# Start server
exec npm run dev