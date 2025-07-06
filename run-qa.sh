
#!/bin/bash

echo "🔍 Starting Automated QA Run..."
echo "================================"

# Check if server is running
if ! curl -f -s "https://569b8f5b-fe7d-444a-a966-c78d010fa3fe-00-13fjnyyxri63e.kirk.replit.dev/api/user" > /dev/null 2>&1; then
  echo "⚠️  Server not responding. Please ensure the development server is running."
  echo "   Run 'npm run dev' in another terminal or use the Run button."
  exit 1
fi

echo "✅ Server is running"
echo ""

# Run the QA validation script
echo "🧪 Running QA Tests..."
node qa-manual-test.js

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ QA Run Completed Successfully!"
  echo ""
  echo "📋 Next Steps:"
  echo "  • Check the browser at your app URL for visual validation"
  echo "  • Test button hover/active/focus states manually"
  echo "  • Verify infinite scroll behavior in the feed"
  echo "  • Test disabled button states in forms"
else
  echo ""
  echo "❌ QA Run Failed. Please check the logs above."
  echo ""
  echo "🔧 Common Issues:"
  echo "  • Server not running (use 'npm run dev')"
  echo "  • Database connection issues"
  echo "  • Authentication problems"
  exit 1
fi
