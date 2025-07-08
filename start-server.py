#!/usr/bin/env python3
"""
Circles Application Server Startup Script
Handles Node.js environment setup and application launch
"""

import os
import subprocess
import sys
import time
from pathlib import Path

def find_node_binary():
    """Find the Node.js binary in the system"""
    # Check common locations
    node_paths = [
        "/nix/store/0akvkk9k1a7z5vjp34yz6dr91j776jhv-nodejs-20.11.1/bin/node",
        "/usr/bin/node",
        "/usr/local/bin/node",
        "node"
    ]
    
    for path in node_paths:
        try:
            result = subprocess.run([path, "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Found Node.js at: {path}")
                print(f"✅ Version: {result.stdout.strip()}")
                return os.path.dirname(path)
        except FileNotFoundError:
            continue
    
    # Search in nix store
    try:
        nix_store = Path("/nix/store")
        if nix_store.exists():
            for nodejs_dir in nix_store.glob("*nodejs*"):
                node_bin = nodejs_dir / "bin" / "node"
                if node_bin.exists():
                    print(f"✅ Found Node.js in Nix store: {node_bin}")
                    return str(nodejs_dir / "bin")
    except Exception as e:
        print(f"⚠️ Error searching Nix store: {e}")
    
    return None

def start_application():
    """Start the Circles application"""
    print("🚀 Starting Circles - Food Experience Sharing Platform")
    print("=" * 50)
    
    # Find Node.js binary
    node_bin_dir = find_node_binary()
    if not node_bin_dir:
        print("❌ Node.js not found in system")
        sys.exit(1)
    
    # Set up environment
    env = os.environ.copy()
    env["PATH"] = f"{node_bin_dir}:{env.get('PATH', '')}"
    env["NODE_ENV"] = "development"
    
    # Set database URL if not provided
    if "DATABASE_URL" not in env:
        print("⚠️ DATABASE_URL not set, using default")
        env["DATABASE_URL"] = "postgresql://localhost:5432/circles"
    
    print(f"📊 Database: {env.get('DATABASE_URL', 'Not set')}")
    print(f"🌐 Environment: {env.get('NODE_ENV', 'Not set')}")
    print()
    
    # Start the application
    try:
        print("🔄 Starting development server...")
        result = subprocess.run(
            ["npm", "run", "dev"],
            env=env,
            cwd=os.getcwd()
        )
        return result.returncode
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return 0
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(start_application())