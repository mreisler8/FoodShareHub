import { SearchCache } from './searchCache';

/**
 * Circuit Breaker for Google Places API
 */
class PlacesCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor() {
    this.failureThreshold = parseInt(process.env.PLACES_CIRCUIT_FAILURES || '5', 10);
    this.cooldownMs = parseInt(process.env.PLACES_CIRCUIT_COOLDOWN_S || '60', 10) * 1000;
  }

  canExecute(): boolean {
    if (this.failures < this.failureThreshold) {
      return true;
    }

    const now = Date.now();
    if (now - this.lastFailureTime > this.cooldownMs) {
      // Reset circuit breaker after cooldown
      this.failures = 0;
      this.lastFailureTime = 0;
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      console.log(`Places circuit breaker opened after ${this.failures} failures`);
    }
  }

  getStatus(): { failures: number; isOpen: boolean; cooldownEndsAt: number | null } {
    const isOpen = this.failures >= this.failureThreshold;
    const cooldownEndsAt = isOpen ? this.lastFailureTime + this.cooldownMs : null;
    
    return {
      failures: this.failures,
      isOpen,
      cooldownEndsAt
    };
  }
}

/**
 * Enhanced Google Places Service with timeout, circuit breaker, and caching
 */
export class PlacesService {
  private circuitBreaker: PlacesCircuitBreaker;
  private readonly timeoutMs: number;
  private readonly enabled: boolean;

  constructor() {
    this.circuitBreaker = new PlacesCircuitBreaker();
    this.timeoutMs = parseInt(process.env.PLACES_TIMEOUT_MS || '200', 10);
    this.enabled = process.env.ENABLE_PLACES !== 'false';
  }

  /**
   * Search places with timeout, circuit breaker, and caching
   */
  async searchPlaces(query: string, lat?: number, lng?: number): Promise<any[] | null> {
    if (!this.enabled) {
      return null;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      console.log(`Places search blocked by circuit breaker: ${query}`);
      return null;
    }

    // Check cache first
    const cached = await SearchCache.getCachedPlacesSearch(query, lat, lng);
    if (cached !== null) {
      return cached;
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        this.executeSearchPlaces(query, lat, lng),
        this.createTimeout(this.timeoutMs, `Places search timeout: ${query}`)
      ]);

      this.circuitBreaker.recordSuccess();
      
      // Cache successful results (including empty arrays)
      await SearchCache.cachePlacesSearch(query, result || [], lat, lng);
      
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      
      if (error.message?.includes('timeout')) {
        console.log(`Places search timeout: ${query} (${this.timeoutMs}ms)`);
      } else {
        console.log(`Places search error: ${query}`, error.message);
      }
      
      return null;
    }
  }

  /**
   * Get place details with timeout, circuit breaker, and caching
   */
  async getPlaceDetails(placeId: string): Promise<any | null> {
    if (!this.enabled) {
      return null;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      console.log(`Place details blocked by circuit breaker: ${placeId}`);
      return null;
    }

    // Check cache first
    const cached = await SearchCache.getCachedPlaceDetails(placeId);
    if (cached !== null) {
      return cached;
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        this.executeGetPlaceDetails(placeId),
        this.createTimeout(this.timeoutMs, `Place details timeout: ${placeId}`)
      ]);

      this.circuitBreaker.recordSuccess();
      
      // Cache successful results (including null)
      await SearchCache.cachePlaceDetails(placeId, result);
      
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      
      if (error.message?.includes('timeout')) {
        console.log(`Place details timeout: ${placeId} (${this.timeoutMs}ms)`);
      } else {
        console.log(`Place details error: ${placeId}`, error.message);
      }
      
      return null;
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return {
      ...this.circuitBreaker.getStatus(),
      enabled: this.enabled,
      timeoutMs: this.timeoutMs
    };
  }

  /**
   * Execute actual Places search API call
   */
  private async executeSearchPlaces(query: string, lat?: number, lng?: number): Promise<any[]> {
    try {
      // Import the actual Google Places service
      const googlePlacesModule = await import('./google-places');
      const searchGooglePlaces = googlePlacesModule.searchGooglePlaces;
      
      if (typeof searchGooglePlaces !== 'function') {
        console.error('searchGooglePlaces is not a function');
        return [];
      }
      
      const results = await searchGooglePlaces(query);
      return results || [];
    } catch (error) {
      console.error('Error importing or calling Google Places:', error);
      return [];
    }
  }

  /**
   * Execute actual Place details API call
   */
  private async executeGetPlaceDetails(placeId: string): Promise<any> {
    try {
      // Import the actual Google Places service
      const googlePlacesModule = await import('./google-places');
      const getPlaceDetails = googlePlacesModule.getPlaceDetails;
      
      if (typeof getPlaceDetails !== 'function') {
        console.error('getPlaceDetails is not a function');
        return null;
      }
      
      return await getPlaceDetails(placeId);
    } catch (error) {
      console.error('Error importing or calling Google Place details:', error);
      return null;
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Merge database results with Places results, deduplicating by googlePlaceId or name+location
   */
  static mergeRestaurantResults(dbResults: any[], placesResults: any[] | null): any[] {
    if (!placesResults || placesResults.length === 0) {
      return dbResults;
    }

    const merged = [...dbResults];
    const existingIds = new Set(dbResults.map(r => r.googlePlaceId).filter(Boolean));
    const existingNames = new Set(
      dbResults.map(r => this.normalizeNameLocation(r.name, r.location)).filter(Boolean)
    );

    for (const place of placesResults) {
      // Skip if we already have this place by googlePlaceId
      if (place.googlePlaceId && existingIds.has(place.googlePlaceId)) {
        continue;
      }

      // Skip if we already have this place by normalized name+location
      const normalized = this.normalizeNameLocation(place.name, place.location);
      if (normalized && existingNames.has(normalized)) {
        continue;
      }

      // Add unique place result
      merged.push({
        ...place,
        source: 'google'
      });

      // Track this addition to prevent future duplicates in this merge
      if (place.googlePlaceId) {
        existingIds.add(place.googlePlaceId);
      }
      if (normalized) {
        existingNames.add(normalized);
      }
    }

    return merged;
  }

  /**
   * Normalize name and location for deduplication
   */
  private static normalizeNameLocation(name?: string, location?: string): string | null {
    if (!name) return null;
    
    const normalizedName = name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const normalizedLocation = location 
      ? location.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
      : '';

    return `${normalizedName}|${normalizedLocation}`;
  }

  /**
   * Reset circuit breaker (for testing/admin purposes)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = new PlacesCircuitBreaker();
  }
}

// Singleton instance
export const placesService = new PlacesService();
export default placesService;