/**
 * Save Count Reconciler
 * 
 * Recomputes saveCount from actual savedLists data to fix drift.
 * Safe for dev/admin use - reads from savedLists and updates restaurantLists.
 */

import { db } from '../../server/db';
import { restaurantLists, savedLists } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

interface ReconcileStats {
  total: number;
  updated: number;
  errors: number;
  driftFixed: number;
}

async function reconcileSaveCounts(): Promise<ReconcileStats> {
  console.log('🔄 Reconciling save counts...');
  
  const stats: ReconcileStats = {
    total: 0,
    updated: 0,
    errors: 0,
    driftFixed: 0,
  };

  try {
    // Get all lists with their current save counts
    const lists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        currentSaveCount: restaurantLists.saveCount,
      })
      .from(restaurantLists);

    console.log(`📋 Processing ${lists.length} lists...`);
    stats.total = lists.length;

    // Get actual save counts from savedLists
    const actualSaveCounts = await db
      .select({
        listId: savedLists.listId,
        actualCount: sql<number>`count(*)::int`,
      })
      .from(savedLists)
      .groupBy(savedLists.listId);

    // Create lookup map
    const actualCountsMap: Record<number, number> = {};
    actualSaveCounts.forEach(({ listId, actualCount }) => {
      actualCountsMap[listId] = actualCount;
    });

    // Process each list
    for (const list of lists) {
      try {
        const actualCount = actualCountsMap[list.id] || 0;
        const currentCount = list.currentSaveCount || 0;
        
        if (actualCount !== currentCount) {
          // Update the count
          await db
            .update(restaurantLists)
            .set({ saveCount: actualCount })
            .where(eq(restaurantLists.id, list.id));

          stats.driftFixed++;
          
          console.log(`✅ Fixed list ${list.id} "${list.name}": ${currentCount} → ${actualCount}`);
        }
        
        stats.updated++;
        
        if (stats.updated % 100 === 0) {
          console.log(`⚡ Processed ${stats.updated}/${stats.total} lists...`);
        }
      } catch (error) {
        console.error(`❌ Error processing list ${list.id}:`, error);
        stats.errors++;
      }
    }

    console.log(`✅ Reconciliation complete!`);
    console.log(`📊 Stats:`);
    console.log(`   Total lists: ${stats.total}`);
    console.log(`   Successfully updated: ${stats.updated}`);
    console.log(`   Drift corrections: ${stats.driftFixed}`);
    console.log(`   Errors: ${stats.errors}`);
    
    if (stats.driftFixed > 0) {
      console.log(`🔧 Fixed ${stats.driftFixed} lists with incorrect save counts`);
    } else {
      console.log(`✅ All save counts were already accurate`);
    }

    return stats;
  } catch (error) {
    console.error('💥 Reconciliation failed:', error);
    throw error;
  }
}

/**
 * Test reconciler with sample data (safe for testing)
 */
async function testReconcilerInternal(): Promise<void> {
  console.log('🧪 Testing reconciler logic...');
  
  try {
    // Get a small sample of lists
    const sampleLists = await db
      .select({
        id: restaurantLists.id,
        name: restaurantLists.name,
        saveCount: restaurantLists.saveCount,
      })
      .from(restaurantLists)
      .limit(5);

    console.log('📋 Sample lists:');
    for (const list of sampleLists) {
      // Get actual count for this list
      const actualCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(savedLists)
        .where(eq(savedLists.listId, list.id));

      const actual = actualCount[0]?.count || 0;
      const stored = list.saveCount || 0;
      const status = actual === stored ? '✅' : '❌';
      
      console.log(`   ${status} List ${list.id}: "${list.name}" - Stored: ${stored}, Actual: ${actual}`);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  if (command === 'test') {
    testReconcilerInternal()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    reconcileSaveCounts()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Reconciliation failed:', error);
        process.exit(1);
      });
  }
}

export { reconcileSaveCounts };