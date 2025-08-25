#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Phase 2 Button Migration Audit Script
// This script identifies all files that need button migration

const AUDIT_RESULTS = {
  duplicateComponents: [],
  actionButtonImports: [],
  oldButtonImports: [],
  hardcodedButtons: [],
  customButtonClasses: [],
  totalFiles: 0,
  migrationRequired: 0
};

// Files to DELETE after migration
const FILES_TO_DELETE = [
  'client/src/components/Button.tsx',
  'client/src/components/Button.css',
  'client/src/components/restaurant/ActionButton.tsx',
];

// Patterns to find
const PATTERNS = {
  actionButton: /import.*ActionButton.*from/g,
  oldButton: /import.*Button.*from.*['"]@\/components\/Button['"]|['"]\.\.\/Button['"]|['"]\.\.\/\.\.\/Button['"]/g,
  hardcodedButton: /<button\s+(?!.*Button\s+variant)/gi,
  customButtonClass: /className=.*btn-(?:primary|secondary|outline|ghost|sm|md|lg)/g,
};

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  let needsMigration = false;

  // Check for ActionButton imports
  if (PATTERNS.actionButton.test(content)) {
    AUDIT_RESULTS.actionButtonImports.push(relativePath);
    needsMigration = true;
  }

  // Check for old Button imports
  if (PATTERNS.oldButton.test(content)) {
    AUDIT_RESULTS.oldButtonImports.push(relativePath);
    needsMigration = true;
  }

  // Check for hardcoded button elements
  const hardcodedMatches = content.match(PATTERNS.hardcodedButton);
  if (hardcodedMatches && hardcodedMatches.length > 0) {
    AUDIT_RESULTS.hardcodedButtons.push({
      file: relativePath,
      count: hardcodedMatches.length
    });
    needsMigration = true;
  }

  // Check for custom button classes
  if (PATTERNS.customButtonClass.test(content)) {
    AUDIT_RESULTS.customButtonClasses.push(relativePath);
    needsMigration = true;
  }

  if (needsMigration) {
    AUDIT_RESULTS.migrationRequired++;
  }
}

// Main audit function
function runAudit() {
  console.log('🔍 Phase 2 Button Migration Audit Starting...\n');

  // Find all TypeScript/JavaScript files
  const files = glob.sync('client/src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'client/src/components/ui/button.tsx' // Our target component
    ]
  });

  AUDIT_RESULTS.totalFiles = files.length;

  // Audit each file
  files.forEach(file => {
    auditFile(file);
  });

  // Generate report
  console.log('📊 BUTTON MIGRATION AUDIT REPORT\n');
  console.log('='.repeat(60));
  console.log(`Total files scanned: ${AUDIT_RESULTS.totalFiles}`);
  console.log(`Files requiring migration: ${AUDIT_RESULTS.migrationRequired}`);
  console.log('='.repeat(60));

  console.log('\n🗑️  FILES TO DELETE:');
  FILES_TO_DELETE.forEach(file => {
    console.log(`  - ${file}`);
  });

  console.log('\n📦 ActionButton imports found in:');
  AUDIT_RESULTS.actionButtonImports.forEach(file => {
    console.log(`  - ${file}`);
  });

  console.log('\n📦 Old Button imports found in:');
  AUDIT_RESULTS.oldButtonImports.forEach(file => {
    console.log(`  - ${file}`);
  });

  console.log('\n🔧 Hardcoded <button> elements found in:');
  AUDIT_RESULTS.hardcodedButtons.forEach(({file, count}) => {
    console.log(`  - ${file} (${count} instances)`);
  });

  console.log('\n🎨 Custom button classes found in:');
  AUDIT_RESULTS.customButtonClasses.forEach(file => {
    console.log(`  - ${file}`);
  });

  // Write detailed migration map
  const migrationMap = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: AUDIT_RESULTS.totalFiles,
      filesNeedingMigration: AUDIT_RESULTS.migrationRequired,
      filesToDelete: FILES_TO_DELETE.length
    },
    filesToDelete: FILES_TO_DELETE,
    migrations: {
      actionButtonImports: AUDIT_RESULTS.actionButtonImports,
      oldButtonImports: AUDIT_RESULTS.oldButtonImports,
      hardcodedButtons: AUDIT_RESULTS.hardcodedButtons,
      customButtonClasses: AUDIT_RESULTS.customButtonClasses
    }
  };

  fs.writeFileSync('button-migration-map.json', JSON.stringify(migrationMap, null, 2));
  console.log('\n✅ Migration map saved to button-migration-map.json');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Review the migration map');
  console.log('2. Run the migration script to update all imports');
  console.log('3. Delete obsolete files');
  console.log('4. Run tests to verify');
}

// Run the audit
runAudit();