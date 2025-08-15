/**
 * Visibility Backfill Report (Read-Only)
 * 
 * Analyzes current visibility data and provides migration report
 * without making any changes to the database.
 * 
 * Usage: tsx scripts/migrations/report_visibility_backfill.ts
 */

import { db } from '../../server/db';
import { restaurantLists } from '../../shared/schema';
import { generateMigrationReportEntry } from '../../server/utils/visibility-normalizer';

interface MigrationStats {
  total: number;
  alreadyMigrated: number;
  needsMigration: number;
  byVisibilityType: Record<string, number>;
  conflicts: any[];
  unmappedRows: any[];
}

async function generateVisibilityReport(): Promise<void> {
  console.log('📊 Visibility Migration Report (Read-Only)');
  console.log('==========================================\n');
  
  try {
    // Fetch all lists with visibility-related fields
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        createdById: restaurantLists.createdById,
        visibilityV2: restaurantLists.visibilityV2,
        visibilityCircleIds: restaurantLists.visibilityCircleIds,
        makePublic: restaurantLists.makePublic,
        isPublic: restaurantLists.isPublic,
        shareWithCircle: restaurantLists.shareWithCircle,
        circleId: restaurantLists.circleId,
        visibility: restaurantLists.visibility,
        createdAt: restaurantLists.createdAt,
      })
      .from(restaurantLists)
      .orderBy(restaurantLists.id);

    const stats: MigrationStats = {
      total: lists.length,
      alreadyMigrated: 0,
      needsMigration: 0,
      byVisibilityType: {},
      conflicts: [],
      unmappedRows: [],
    };

    const sampleDiffs: any[] = [];
    
    console.log(`📋 Analyzing ${lists.length} lists...\n`);

    for (const list of lists) {
      const reportEntry = generateMigrationReportEntry(list);
      
      // Count already migrated (has visibilityV2)
      if (list.visibilityV2) {
        stats.alreadyMigrated++;
        
        // Check for conflicts between V2 and derived
        if (list.visibilityV2 !== reportEntry.derivedVisibility) {
          stats.conflicts.push({
            listId: list.id,
            name: list.name,
            currentV2: list.visibilityV2,
            derivedFromLegacy: reportEntry.derivedVisibility,
            legacyFields: reportEntry.legacyFields,
          });
        }
      } else {
        stats.needsMigration++;
        
        // Add to sample diffs (first 5)
        if (sampleDiffs.length < 5) {
          sampleDiffs.push({
            listId: list.id,
            name: list.name,
            willBecomeV2: reportEntry.derivedVisibility,
            circleIds: reportEntry.derivedCircleIds,
            basedOn: reportEntry.legacyFields,
          });
        }
      }
      
      // Count by visibility type (what it will be after migration)
      const finalVisibility = list.visibilityV2 || reportEntry.derivedVisibility;
      stats.byVisibilityType[finalVisibility] = (stats.byVisibilityType[finalVisibility] || 0) + 1;
      
      // Check for unmapped cases (shouldn't happen with current logic)
      if (!reportEntry.derivedVisibility) {
        stats.unmappedRows.push({
          listId: list.id,
          name: list.name,
          fields: reportEntry.legacyFields,
        });
      }
    }

    // Print summary
    console.log('📈 Migration Summary:');
    console.log(`   Total Lists: ${stats.total}`);
    console.log(`   Already Migrated (has visibilityV2): ${stats.alreadyMigrated}`);
    console.log(`   Needs Migration: ${stats.needsMigration}`);
    console.log(`   Migration Coverage: ${Math.round((stats.alreadyMigrated / stats.total) * 100)}%\n`);
    
    console.log('📊 Final Visibility Distribution:');
    Object.entries(stats.byVisibilityType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([visibility, count]) => {
        const percentage = Math.round((count / stats.total) * 100);
        console.log(`   ${visibility}: ${count} (${percentage}%)`);
      });
    
    // Show conflicts if any
    if (stats.conflicts.length > 0) {
      console.log(`\n⚠️  Conflicts Found (${stats.conflicts.length}):`);
      console.log('   Lists where visibilityV2 differs from derived legacy value:');
      stats.conflicts.slice(0, 3).forEach(conflict => {
        console.log(`   - List ${conflict.listId}: "${conflict.name}"`);
        console.log(`     Current V2: ${conflict.currentV2}`);
        console.log(`     Derived: ${conflict.derivedFromLegacy}`);
        console.log(`     Legacy: ${JSON.stringify(conflict.legacyFields, null, 2)}`);
      });
      if (stats.conflicts.length > 3) {
        console.log(`   ... and ${stats.conflicts.length - 3} more`);
      }
    }
    
    // Show sample migrations
    if (sampleDiffs.length > 0) {
      console.log(`\n🔄 Sample Migrations (${sampleDiffs.length} of ${stats.needsMigration}):`);
      sampleDiffs.forEach(sample => {
        console.log(`   - List ${sample.listId}: "${sample.name}"`);
        console.log(`     Will become: ${sample.willBecomeV2}`);
        if (sample.circleIds) {
          console.log(`     Circle IDs: ${JSON.stringify(sample.circleIds)}`);
        }
        console.log(`     Based on: ${JSON.stringify(sample.basedOn, null, 2)}`);
      });
    }
    
    // Show unmapped if any (should be zero)
    if (stats.unmappedRows.length > 0) {
      console.log(`\n❌ Unmapped Rows (${stats.unmappedRows.length}):`);
      stats.unmappedRows.forEach(row => {
        console.log(`   - List ${row.listId}: "${row.name}"`);
        console.log(`     Fields: ${JSON.stringify(row.fields, null, 2)}`);
      });
    }
    
    // Migration safety notes
    console.log('\n🛡️  Migration Safety:');
    console.log('   - This report is read-only (no data modified)');
    console.log('   - Migration script preserves all legacy fields');
    console.log('   - Feature flag LISTS_VISIBILITY_V2 controls V2 usage');
    console.log('   - Rollback: disable flag to revert to legacy behavior');
    
    // Rollback instructions
    console.log('\n🔄 Rollback Instructions:');
    console.log('   1. Set LISTS_VISIBILITY_V2=false in environment');
    console.log('   2. Restart application');
    console.log('   3. All reads will use legacy visibility logic');
    console.log('   4. Optional: Reset visibilityV2 columns to NULL if needed');
    
    console.log('\n✅ Report complete. Ready for migration when approved.');
    
  } catch (error) {
    console.error('💥 Report generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateVisibilityReport()
    .then(() => {
      console.log('\n📊 Visibility report generated successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Report failed:', error);
      process.exit(1);
    });
}

export { generateVisibilityReport };