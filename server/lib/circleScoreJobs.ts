
import { circleScorePreCalculator } from './circleScoreCache';

/**
 * Trigger Circle Score pre-calculation when new ratings are added
 */
export async function onNewRating(restaurantId: number | null, googlePlaceId: string | null): Promise<void> {
  try {
    // Invalidate existing cache
    circleScorePreCalculator.invalidateRestaurantCache(restaurantId, googlePlaceId);
    
    // Trigger background pre-calculation
    setImmediate(() => {
      circleScorePreCalculator.preCalculateForPopularRestaurants(restaurantId, googlePlaceId);
    });
  } catch (error) {
    console.error('Error triggering Circle Score job on new rating:', error);
  }
}

/**
 * Trigger Circle Score pre-calculation when restaurants are added to lists
 */
export async function onListPlacement(restaurantId: number | null, googlePlaceId: string | null): Promise<void> {
  try {
    // Invalidate existing cache
    circleScorePreCalculator.invalidateRestaurantCache(restaurantId, googlePlaceId);
    
    // Trigger background pre-calculation
    setImmediate(() => {
      circleScorePreCalculator.preCalculateForPopularRestaurants(restaurantId, googlePlaceId);
    });
  } catch (error) {
    console.error('Error triggering Circle Score job on list placement:', error);
  }
}

/**
 * Trigger Circle Score updates when trust networks change
 */
export async function onTrustNetworkChange(userId: number): Promise<void> {
  try {
    // For now, we'll just log this - could implement more sophisticated invalidation
    console.log(`Trust network changed for user ${userId} - consider recalculating scores`);
  } catch (error) {
    console.error('Error handling trust network change:', error);
  }
}
