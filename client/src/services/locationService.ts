export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
  timestamp?: number;
}

export class LocationService {
  private static instance: LocationService;
  private cachedLocation: LocationData | null = null;
  private locationCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Get current location with caching
   */
  async getCurrentLocation(): Promise<LocationData> {
    console.log('🌍 LOCATION SERVICE: getCurrentLocation called');
    
    // Check if cached location is still valid
    if (this.cachedLocation && Date.now() - this.locationCacheTime < this.CACHE_DURATION) {
      console.log('🌍 LOCATION SERVICE: Returning cached location:', this.cachedLocation);
      return this.cachedLocation;
    }

    console.log('🌍 LOCATION SERVICE: No valid cache, requesting fresh location');

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('🌍 LOCATION SERVICE: Geolocation not supported');
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      console.log('🌍 LOCATION SERVICE: Calling navigator.geolocation.getCurrentPosition');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('🌍 LOCATION SERVICE: Position obtained:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };

          // Try to get reverse geocoding
          try {
            console.log('🌍 LOCATION SERVICE: Attempting reverse geocoding');
            const address = await this.reverseGeocode(locationData.lat, locationData.lng);
            locationData.address = address.formatted_address;
            locationData.city = address.city;
            locationData.country = address.country;
            console.log('🌍 LOCATION SERVICE: Reverse geocoding successful:', address);
          } catch (error) {
            console.warn('🌍 LOCATION SERVICE: Reverse geocoding failed:', error);
          }

          // Cache the location
          this.cachedLocation = locationData;
          this.locationCacheTime = Date.now();

          console.log('🌍 LOCATION SERVICE: Final location data:', locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('🌍 LOCATION SERVICE: Geolocation error:', {
            code: error.code,
            message: error.message
          });

          let message = 'Unable to get your location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access was denied. Please enable location permissions.';
              console.error('🌍 LOCATION SERVICE: Permission denied');
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              console.error('🌍 LOCATION SERVICE: Position unavailable');
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              console.error('🌍 LOCATION SERVICE: Request timeout');
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout to 15 seconds
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Reverse geocode coordinates to address
   */
  private async reverseGeocode(lat: number, lng: number): Promise<{
    formatted_address: string;
    city: string;
    country: string;
  }> {
    try {
      const response = await fetch(
        `/api/geocode/reverse?lat=${lat}&lng=${lng}`
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      // If we got proper city data, return it
      if (data.city && data.city !== 'Current Location') {
        return data;
      }

      // Fallback to client-side city detection
      const cityInfo = this.detectCityFromCoordinates(lat, lng);
      return {
        formatted_address: cityInfo.address,
        city: cityInfo.city,
        country: cityInfo.country
      };
    } catch (error) {
      // Final fallback to client-side city detection
      const cityInfo = this.detectCityFromCoordinates(lat, lng);
      return {
        formatted_address: cityInfo.address,
        city: cityInfo.city,
        country: cityInfo.country
      };
    }
  }

  /**
   * Detect city from coordinates using known city database
   */
  private detectCityFromCoordinates(lat: number, lng: number): {
    address: string;
    city: string;
    country: string;
  } {
    // Known cities with their approximate boundaries
    const cities = [
      { name: 'Toronto', lat: 43.6532, lng: -79.3832, radius: 0.5, country: 'Canada' },
      { name: 'Vancouver', lat: 49.2827, lng: -123.1207, radius: 0.5, country: 'Canada' },
      { name: 'Montreal', lat: 45.5017, lng: -73.5673, radius: 0.5, country: 'Canada' },
      { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 0.5, country: 'USA' },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 0.5, country: 'USA' },
      { name: 'Chicago', lat: 41.8781, lng: -87.6298, radius: 0.5, country: 'USA' },
      { name: 'London', lat: 51.5074, lng: -0.1278, radius: 0.5, country: 'UK' },
      { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 0.5, country: 'France' },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503, radius: 0.5, country: 'Japan' },
    ];

    // Find closest city within radius
    for (const city of cities) {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      if (distance <= city.radius * 111) { // Convert degrees to km (roughly)
        return {
          address: `${city.name}, ${city.country}`,
          city: city.name,
          country: city.country
        };
      }
    }

    // No match found, return coordinates
    return {
      address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      country: 'Unknown'
    };
  }

  /**
   * Calculate distance between two points in kilometers
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    console.log('🌍 LOCATION SERVICE: Checking permission');
    
    if (!navigator.permissions) {
      console.log('🌍 LOCATION SERVICE: navigator.permissions not available, returning prompt');
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      console.log('🌍 LOCATION SERVICE: Permission state:', result.state);
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      console.warn('🌍 LOCATION SERVICE: Permission query failed:', error);
      return 'prompt';
    }
  }

  /**
   * Get detailed location info with user-friendly display
   */
  async getCurrentLocationWithDisplay(): Promise<LocationData & { 
    displayText: string; 
    accuracy: 'high' | 'medium' | 'low';
    lastUpdated: string;
  }> {
    const location = await this.getCurrentLocation();
    
    return {
      ...location,
      displayText: this.formatLocationDisplay(location),
      accuracy: this.getAccuracyLevel(location),
      lastUpdated: new Date(location.timestamp || Date.now()).toLocaleTimeString()
    };
  }

  /**
   * Check if location services are enabled by user preference
   */
  isLocationEnabled(): boolean {
    return localStorage.getItem('circles_location_enabled') !== 'false';
  }

  /**
   * Toggle location services on/off
   */
  setLocationEnabled(enabled: boolean): void {
    localStorage.setItem('circles_location_enabled', enabled.toString());
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Get manual location override
   */
  getManualLocation(): LocationData | null {
    try {
      const manual = localStorage.getItem('circles_manual_location');
      return manual ? JSON.parse(manual) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set manual location override
   */
  setManualLocation(location: LocationData | null): void {
    if (location) {
      localStorage.setItem('circles_manual_location', JSON.stringify(location));
    } else {
      localStorage.removeItem('circles_manual_location');
    }
    this.clearCache();
  }

  private formatLocationDisplay(location: LocationData): string {
    if (location.city && location.country) {
      return `${location.city}, ${location.country}`;
    }
    if (location.address) {
      return location.address;
    }
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }

  private getAccuracyLevel(location: LocationData): 'high' | 'medium' | 'low' {
    const age = Date.now() - (location.timestamp || 0);
    if (age < 5 * 60 * 1000) return 'high'; // < 5 minutes
    if (age < 30 * 60 * 1000) return 'medium'; // < 30 minutes
    return 'low';
  }

  /**
   * Clear cached location
   */
  clearCache(): void {
    this.cachedLocation = null;
    this.locationCacheTime = 0;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance as default export for backward compatibility
const locationService = LocationService.getInstance();
export default locationService;
export { locationService };