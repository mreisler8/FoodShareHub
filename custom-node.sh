#!/bin/bash
# Find Node.js in Nix store and use it
NODE_BIN=""
for path in /nix/store/*nodejs*/bin/node; do
    if [ -f "$path" ] && [ -x "$path" ]; then
        NODE_BIN="$path"
        break
    fi
done

if [ -z "$NODE_BIN" ]; then
    echo "❌ Node.js not found in Nix store"
    exit 1
fi

export PATH="$(dirname "$NODE_BIN"):$PATH"
export NODE_ENV=development
exec "$NODE_BIN" ./node_modules/.bin/tsx server/index.ts
