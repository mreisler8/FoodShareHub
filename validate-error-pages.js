const puppeteer = require('puppeteer');

async function validateErrorPages() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Console Error:', msg.text());
    }
  });
  
  // Enable error tracking
  page.on('pageerror', error => {
    console.log('🔴 Page Error:', error.message);
  });
  
  const baseUrl = 'http://localhost:5000';
  const results = [];
  
  // Test routes from audit
  const testRoutes = [
    { path: '/profile/7', name: 'Profile Valid', expected: 'PASS' },
    { path: '/profile/999999', name: 'Profile Invalid ID', expected: 'PASS' },
    { path: '/profile/invalid', name: 'Profile Bad Param', expected: 'PASS' },
    { path: '/lists/27', name: 'List Valid', expected: 'PASS' },
    { path: '/lists/999999', name: 'List Invalid ID', expected: 'PASS' },
    { path: '/lists/invalid', name: 'List Bad Param', expected: 'PASS' },
    { path: '/restaurants/1', name: 'Restaurant Valid', expected: 'PASS' },
    { path: '/restaurants/999999', name: 'Restaurant Invalid', expected: 'PASS' },
    { path: '/restaurants/invalid', name: 'Restaurant Bad Param', expected: 'PASS' },
    { path: '/feed', name: 'Feed Page', expected: 'PASS' },
    { path: '/discover', name: 'Discover Page', expected: 'PASS' },
    { path: '/circles', name: 'Circles Page', expected: 'PASS' },
    { path: '/posts/1', name: 'Post Valid', expected: 'PASS' },
    { path: '/posts/999999', name: 'Post Invalid', expected: 'PASS' },
    { path: '/posts/invalid', name: 'Post Bad Param', expected: 'PASS' }
  ];
  
  for (const route of testRoutes) {
    console.log(`Testing ${route.name}: ${route.path}`);
    
    try {
      const startTime = Date.now();
      
      await page.goto(`${baseUrl}${route.path}`, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      const loadTime = Date.now() - startTime;
      
      // Check for error boundaries
      const errorBoundary = await page.$('[data-error-boundary]');
      const errorText = await page.evaluate(() => {
        return document.body.innerText.includes('Something went wrong');
      });
      
      // Check for proper error states
      const hasInlineError = await page.$('.inline-error');
      const hasErrorClass = await page.$('[class*="error"]');
      
      const hasNotFound = await page.$('[class*="not-found"]');
      const notFoundText = await page.evaluate(() => {
        return document.body.innerText.includes('Not Found');
      });
      
      const hasLoadingSkeleton = await page.$('[class*="skeleton"]');
      const hasLoadingClass = await page.$('[class*="loading"]');
      
      const result = {
        route: route.path,
        name: route.name,
        loadTime: `${loadTime}ms`,
        hasErrorBoundary: !!(errorBoundary || errorText),
        hasProperErrorState: !!(hasInlineError || hasErrorClass || hasNotFound || notFoundText || hasLoadingSkeleton || hasLoadingClass),
        status: (!(errorBoundary || errorText) && loadTime < 2000) ? 'PASS' : 'FAIL'
      };
      
      results.push(result);
      console.log(`✅ ${route.name}: ${result.status} (${loadTime}ms)`);
      
    } catch (error) {
      console.log(`❌ ${route.name}: FAIL - ${error.message}`);
      results.push({
        route: route.path,
        name: route.name,
        loadTime: 'TIMEOUT',
        hasErrorBoundary: false,
        hasProperErrorState: false,
        status: 'FAIL',
        error: error.message
      });
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await browser.close();
  return results;
}

validateErrorPages().then(results => {
  console.log('\n📊 VALIDATION RESULTS:');
  console.log('========================');
  
  results.forEach(result => {
    console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.name}: ${result.status} (${result.loadTime})`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  const totalCount = results.length;
  
  console.log(`\n🎯 SUMMARY: ${passCount}/${totalCount} tests passed`);
  console.log(`Pass Rate: ${Math.round(passCount/totalCount * 100)}%`);
  
  if (passCount === totalCount) {
    console.log('\n🎉 GO DECISION: All error page fixes validated successfully!');
  } else {
    console.log('\n⚠️  NO-GO DECISION: Some routes still need fixes.');
  }
  
}).catch(console.error);