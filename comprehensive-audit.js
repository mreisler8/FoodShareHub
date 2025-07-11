
#!/usr/bin/env node

console.log('🔍 Starting Comprehensive Navigation & Button Audit...\n');

// Test navigation paths and components
const navigationTests = [
  // Desktop Sidebar Navigation
  { component: 'DesktopSidebar', path: '/', label: 'Feed' },
  { component: 'DesktopSidebar', path: '/discover', label: 'Discover' },
  { component: 'DesktopSidebar', path: '/user-discovery', label: 'Find People' },
  { component: 'DesktopSidebar', path: '/create-post', label: 'Create Post' },
  { component: 'DesktopSidebar', path: '/circles', label: 'Circles' },
  { component: 'DesktopSidebar', path: '/lists', label: 'My Lists' },
  { component: 'DesktopSidebar', path: '/lists/create', label: 'Create List' },
  { component: 'DesktopSidebar', path: '/settings', label: 'Settings' },
  { component: 'DesktopSidebar', path: '/saved', label: 'Saved Restaurants' },
  { component: 'DesktopSidebar', path: '/profile', label: 'Profile' },
  
  // Mobile Navigation
  { component: 'MobileNavigation', path: '/', label: 'Home' },
  { component: 'MobileNavigation', path: '/discover', label: 'Discover' },
  { component: 'MobileNavigation', path: '/lists', label: 'Lists' },
  { component: 'MobileNavigation', path: '/circles', label: 'Circles' },
  { component: 'MobileNavigation', path: '/profile', label: 'Profile' },
  { component: 'MobileNavigation', path: '/settings', label: 'Settings' },
  
  // Router paths
  { component: 'Router', path: '/feed', label: 'Feed Page' },
  { component: 'Router', path: '/top-picks', label: 'Top Picks' },
  { component: 'Router', path: '/circles/:id', label: 'Circle Details' },
  { component: 'Router', path: '/circles/:id/members', label: 'Circle Members' },
  { component: 'Router', path: '/lists/:id', label: 'List Details' },
  { component: 'Router', path: '/posts/:id', label: 'Post Details' },
  { component: 'Router', path: '/restaurants/:id', label: 'Restaurant Detail' },
  { component: 'Router', path: '/join', label: 'Join Page' },
  { component: 'Router', path: '/join/:inviteCode', label: 'Join Circle' },
  { component: 'Router', path: '/auth', label: 'Auth Page' },
];

console.log('📋 Navigation Path Analysis:\n');

navigationTests.forEach(test => {
  const status = checkNavigationPath(test);
  const icon = status.working ? '✅' : '❌';
  console.log(`${icon} ${test.component}: ${test.label} (${test.path})`);
  if (!status.working) {
    console.log(`   ⚠️  Issue: ${status.issue}\n`);
  }
});

function checkNavigationPath(test) {
  // Check if path exists in Router.tsx
  const fs = require('fs');
  
  try {
    const routerContent = fs.readFileSync('client/src/components/Router.tsx', 'utf8');
    
    // Check if route is defined
    const routePattern = new RegExp(`path="${test.path.replace(/:\w+/g, '\\S+')}"`, 'g');
    const hasRoute = routePattern.test(routerContent) || test.path === '/' && routerContent.includes('path="/"');
    
    if (!hasRoute) {
      return { working: false, issue: `Route not found in Router.tsx` };
    }
    
    // Check if component exists for the route
    if (test.component === 'Router') {
      const componentMatch = routerContent.match(new RegExp(`path="${test.path.replace(/:\w+/g, '\\S+')}"[^>]*component=\\{([^}]+)\\}`));
      if (componentMatch) {
        const componentName = componentMatch[1];
        // Check if component file exists
        const possiblePaths = [
          `client/src/pages/${componentName.toLowerCase()}.tsx`,
          `client/src/pages/${componentName}.tsx`,
          `client/src/components/${componentName}.tsx`
        ];
        
        const componentExists = possiblePaths.some(path => {
          try {
            fs.accessSync(path);
            return true;
          } catch {
            return false;
          }
        });
        
        if (!componentExists) {
          return { working: false, issue: `Component ${componentName} file not found` };
        }
      }
    }
    
    return { working: true };
    
  } catch (error) {
    return { working: false, issue: `Error reading files: ${error.message}` };
  }
}

console.log('\n🔗 Button & Link Analysis:\n');

// Check critical buttons and their implementations
const buttonTests = [
  { name: 'Create Post Button', file: 'client/src/components/create-post/CreatePostButton.tsx' },
  { name: 'Follow Button', file: 'client/src/components/user/FollowButton.tsx' },
  { name: 'Search Modal Trigger', file: 'client/src/components/search/UnifiedSearchModal.tsx' },
  { name: 'Profile Stats', file: 'client/src/components/ProfileStats.tsx' },
  { name: 'Restaurant Search', file: 'client/src/components/restaurant/RestaurantSearch.tsx' },
  { name: 'Create List Modal', file: 'client/src/components/lists/CreateListModal.tsx' },
  { name: 'Share List Modal', file: 'client/src/components/lists/ShareListModal.tsx' },
  { name: 'Invite Modal', file: 'client/src/components/circles/InviteModal.tsx' },
  { name: 'Report Modal', file: 'client/src/components/moderation/ReportModal.tsx' },
  { name: 'Add To List Modal', file: 'client/src/components/post/AddToListModal.tsx' },
];

buttonTests.forEach(test => {
  const fs = require('fs');
  try {
    fs.accessSync(test.file);
    console.log(`✅ ${test.name}: File exists`);
    
    // Check for common button issues
    const content = fs.readFileSync(test.file, 'utf8');
    const issues = [];
    
    if (!content.includes('onClick') && !content.includes('onPress') && !content.includes('onSubmit')) {
      issues.push('No click handler found');
    }
    
    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push('Contains TODO/FIXME comments');
    }
    
    if (issues.length > 0) {
      console.log(`   ⚠️  Potential issues: ${issues.join(', ')}`);
    }
    
  } catch (error) {
    console.log(`❌ ${test.name}: File missing (${test.file})`);
  }
});

console.log('\n🎯 Critical User Flows Analysis:\n');

// Check critical user flows
const userFlows = [
  {
    name: 'User Authentication Flow',
    steps: [
      'Visit /auth page',
      'Login/Register forms',
      'Redirect to home after login'
    ],
    files: ['client/src/pages/auth-page.tsx', 'client/src/hooks/use-auth.tsx']
  },
  {
    name: 'Create Post Flow', 
    steps: [
      'Click Create Post button',
      'Select restaurant',
      'Fill post form',
      'Submit post'
    ],
    files: ['client/src/pages/create-post.tsx', 'client/src/components/create-post/CreatePostForm.tsx']
  },
  {
    name: 'Restaurant Discovery Flow',
    steps: [
      'Visit /discover page',
      'Search for restaurants',
      'View restaurant details',
      'Add to list or create post'
    ],
    files: ['client/src/pages/discover.tsx', 'client/src/pages/RestaurantDetailPage.tsx']
  },
  {
    name: 'List Management Flow',
    steps: [
      'Visit /lists page',
      'Create new list',
      'Add restaurants to list',
      'Share list with circles'
    ],
    files: ['client/src/pages/list-details.tsx', 'client/src/components/lists/CreateListModal.tsx']
  },
  {
    name: 'Circle Management Flow',
    steps: [
      'Visit /circles page',
      'Create or join circles',
      'View circle details',
      'Invite members'
    ],
    files: ['client/src/pages/circles.tsx', 'client/src/pages/circle-details.tsx']
  },
  {
    name: 'Profile & Settings Flow',
    steps: [
      'Visit /profile page',
      'Navigate to /settings',
      'Update profile information',
      'Manage privacy settings'
    ],
    files: ['client/src/pages/profile.tsx', 'client/src/pages/settings.tsx']
  }
];

userFlows.forEach(flow => {
  console.log(`📱 ${flow.name}:`);
  
  const missingFiles = [];
  const existingFiles = [];
  
  flow.files.forEach(file => {
    try {
      const fs = require('fs');
      fs.accessSync(file);
      existingFiles.push(file);
    } catch {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length === 0) {
    console.log(`   ✅ All required files present (${existingFiles.length} files)`);
  } else {
    console.log(`   ❌ Missing files: ${missingFiles.join(', ')}`);
    console.log(`   ✅ Existing files: ${existingFiles.join(', ')}`);
  }
  
  console.log(`   📝 Steps: ${flow.steps.join(' → ')}\n`);
});

console.log('🚨 Known Issues from Previous Audits:\n');

const knownIssues = [
  {
    issue: 'Authentication 401 Errors',
    severity: 'HIGH',
    description: 'API requests failing with 401 unauthorized errors',
    impact: 'Users cannot access protected features',
    files: ['server/auth.ts', 'client/src/hooks/use-auth.tsx']
  },
  {
    issue: 'Settings Navigation Missing from Mobile',
    severity: 'HIGH', 
    description: 'Settings link not accessible in mobile navigation',
    impact: 'Mobile users cannot access settings',
    files: ['client/src/components/navigation/MobileNavigation.tsx']
  },
  {
    issue: 'ProfileStats Compilation Error',
    severity: 'MEDIUM',
    description: 'Duplicate function declarations in ProfileStats component',
    impact: 'Component may not render correctly',
    files: ['client/src/components/ProfileStats.tsx']
  },
  {
    issue: 'Search Functionality Issues',
    severity: 'MEDIUM',
    description: 'Search API endpoints may have data flow issues',
    impact: 'Users cannot search effectively',
    files: ['client/src/components/search/UnifiedSearchModal.tsx', 'server/routes/search.ts']
  },
  {
    issue: 'Saved Restaurants Route Missing',
    severity: 'LOW',
    description: '/saved route exists in navigation but not in Router.tsx',
    impact: 'Saved restaurants feature inaccessible',
    files: ['client/src/components/Router.tsx']
  }
];

knownIssues.forEach(issue => {
  const severityIcon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
  console.log(`${severityIcon} ${issue.severity}: ${issue.issue}`);
  console.log(`   📄 Description: ${issue.description}`);
  console.log(`   💥 Impact: ${issue.impact}`);
  console.log(`   📁 Files: ${issue.files.join(', ')}\n`);
});

console.log('🎯 Priority Action Items:\n');

console.log('1. 🔴 IMMEDIATE (Critical functionality broken):');
console.log('   - Fix authentication 401 errors in API middleware');
console.log('   - Add Settings navigation to Mobile Navigation');
console.log('   - Fix ProfileStats component compilation errors');

console.log('\n2. 🟡 HIGH PRIORITY (Major user experience issues):');
console.log('   - Add missing /saved route to Router.tsx');
console.log('   - Verify search functionality end-to-end');
console.log('   - Test all form submissions and data persistence');
console.log('   - Ensure all navigation paths work correctly');

console.log('\n3. 🟢 MEDIUM PRIORITY (Polish and optimization):');
console.log('   - Add loading states for all async operations');
console.log('   - Improve error handling and user feedback');
console.log('   - Test mobile responsiveness across all pages');
console.log('   - Verify all button click handlers work');

console.log('\n✅ Audit Complete! Review the issues above and prioritize fixes based on severity.');
