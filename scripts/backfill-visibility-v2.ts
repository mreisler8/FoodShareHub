/**
 * Migration/Backfill Script: Populate visibility_v2 and visibility_circle_ids
 * 
 * This script consolidates legacy visibility fields into the new canonical system:
 * - isPublic, makePublic, shareWithCircle, visibility (JSON/string) → visibilityV2 + visibilityCircleIds
 * 
 * Run with: npm run backfill:visibility
 */

import { db } from '../server/db';
import { restaurantLists } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface LegacyList {
  id: number;
  isPublic: boolean;
  makePublic: boolean;
  shareWithCircle: boolean;
  circleId: number | null;
  visibility: any; // JSON or string
}

async function backfillVisibilityV2() {
  console.log('🔄 Starting visibility V2 backfill...');
  
  try {
    // Fetch all lists with legacy visibility fields
    const lists = await db
      .select({
        id: restaurantLists.id,
        isPublic: restaurantLists.isPublic,
        makePublic: restaurantLists.makePublic,
        shareWithCircle: restaurantLists.shareWithCircle,
        circleId: restaurantLists.circleId,
        visibility: restaurantLists.visibility,
      })
      .from(restaurantLists);

    console.log(`📋 Found ${lists.length} lists to process`);

    let updated = 0;
    let errors = 0;

    for (const list of lists) {
      try {
        const { visibilityV2, visibilityCircleIds } = determineVisibilityV2(list);
        
        await db
          .update(restaurantLists)
          .set({
            visibilityV2,
            visibilityCircleIds,
          })
          .where(eq(restaurantLists.id, list.id));

        updated++;
        
        if (updated % 100 === 0) {
          console.log(`⚡ Processed ${updated}/${lists.length} lists...`);
        }
      } catch (error) {
        console.error(`❌ Error processing list ${list.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Backfill complete: ${updated} updated, ${errors} errors`);
    
    // Verification query
    const verification = await db
      .select({
        visibilityV2: restaurantLists.visibilityV2,
        count: 'count(*) as count'
      })
      .from(restaurantLists)
      .groupBy(restaurantLists.visibilityV2);
    
    console.log('📊 Final visibility distribution:', verification);
    
  } catch (error) {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  }
}

function determineVisibilityV2(list: LegacyList): {
  visibilityV2: 'private' | 'public' | 'followers' | 'circle';
  visibilityCircleIds: number[] | null;
} {
  // Priority order based on the requirements:
  
  // 1. If makePublic=true OR isPublic=true → 'public'
  if (list.makePublic || list.isPublic) {
    return {
      visibilityV2: 'public',
      visibilityCircleIds: null,
    };
  }
  
  // 2. If shareWithCircle=true AND circleId IS NOT NULL → 'circle'
  if (list.shareWithCircle && list.circleId) {
    return {
      visibilityV2: 'circle',
      visibilityCircleIds: [list.circleId],
    };
  }
  
  // 3. Check legacy visibility JSON for followers
  if (list.visibility) {
    try {
      const vis = typeof list.visibility === 'string' 
        ? JSON.parse(list.visibility) 
        : list.visibility;
      
      if (vis?.followers === true) {
        return {
          visibilityV2: 'followers',
          visibilityCircleIds: null,
        };
      }
      
      // Check for circle IDs in legacy visibility
      if (vis?.circleIds && Array.isArray(vis.circleIds) && vis.circleIds.length > 0) {
        return {
          visibilityV2: 'circle',
          visibilityCircleIds: vis.circleIds,
        };
      }
    } catch (e) {
      console.warn(`Invalid visibility JSON for list ${list.id}:`, list.visibility);
    }
  }
  
  // 4. Default to 'private'
  return {
    visibilityV2: 'private',
    visibilityCircleIds: null,
  };
}

// Run if called directly
if (require.main === module) {
  backfillVisibilityV2()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}

export { backfillVisibilityV2 };