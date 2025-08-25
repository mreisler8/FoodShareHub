/**
 * React Hooks Validation Test
 * Validates the fix for "Rendered more hooks than during the previous render" error
 */

// Parse the RestaurantDetailPage component to validate hook calling order
const fs = require('fs');
const path = require('path');

function validateHooksOrder() {
  const filePath = path.join(__dirname, 'client/src/pages/RestaurantDetailPage.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all hook calls and early returns
  const lines = content.split('\n');
  const findings = [];
  
  let inComponent = false;
  let hookCallLines = [];
  let earlyReturnLines = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Mark component start
    if (trimmed.includes('export default function RestaurantDetailPage()')) {
      inComponent = true;
      return;
    }
    
    if (!inComponent) return;
    
    // Find hook calls
    if (trimmed.includes('useQuery') || 
        trimmed.includes('useMemo') || 
        trimmed.includes('useCallback') ||
        trimmed.includes('useState') ||
        trimmed.includes('useEffect') ||
        trimmed.includes('useStandardizedRestaurantQueries')) {
      hookCallLines.push({ lineNum, content: trimmed });
    }
    
    // Find early returns
    if (trimmed.startsWith('if (') && 
        (trimmed.includes('return') || lines[index + 1]?.trim().startsWith('return'))) {
      earlyReturnLines.push({ lineNum, content: trimmed });
    }
  });
  
  console.log('🔍 REACT HOOKS VALIDATION RESULTS\n');
  
  console.log('✅ Hook Calls Found (in order):');
  hookCallLines.forEach((hook, i) => {
    console.log(`  ${i + 1}. Line ${hook.lineNum}: ${hook.content.substring(0, 80)}...`);
  });
  
  console.log('\n🚪 Early Returns Found:');
  earlyReturnLines.forEach((ret, i) => {
    console.log(`  ${i + 1}. Line ${ret.lineNum}: ${ret.content}`);
  });
  
  // Validation logic
  const lastHookLine = Math.max(...hookCallLines.map(h => h.lineNum));
  const firstReturnLine = Math.min(...earlyReturnLines.map(r => r.lineNum));
  
  console.log(`\n📊 ANALYSIS:`);
  console.log(`  Last hook call: Line ${lastHookLine}`);
  console.log(`  First early return: Line ${firstReturnLine}`);
  
  if (lastHookLine < firstReturnLine) {
    console.log(`\n✅ SUCCESS: All hooks are called BEFORE early returns`);
    console.log(`   Gap: ${firstReturnLine - lastHookLine} lines between last hook and first return`);
    return true;
  } else {
    console.log(`\n❌ FAILURE: Hooks called AFTER early returns (React violation)`);
    return false;
  }
}

// Run validation
const isValid = validateHooksOrder();
process.exit(isValid ? 0 : 1);