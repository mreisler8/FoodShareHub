#!/bin/bash

# Development Persona Seed Runner
# Since package.json editing is restricted, this script runs the personas seed

echo "🚀 Starting development persona seed..."

# Set environment variables for development
export DEV_TEST_PERSONAS=true
export NODE_ENV=development

# Run the seed script
tsx scripts/seed-dev-personas.ts

echo "✅ Persona seed complete!"
echo "🔗 Ready for E2E testing at: http://localhost:5000"