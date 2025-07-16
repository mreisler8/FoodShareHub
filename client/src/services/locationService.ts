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
    // Check if cached location is still valid
    if (this.cachedLocation && Date.now() - this.locationCacheTime < this.CACHE_DURATION) {
      return this.cachedLocation;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };

          // Try to get reverse geocoding
          try {
            const address = await this.reverseGeocode(locationData.lat, locationData.lng);
            locationData.address = address.formatted_address;
            locationData.city = address.city;
            locationData.country = address.country;
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }

          // Cache the location
          this.cachedLocation = locationData;
          this.locationCacheTime = Date.now();

          resolve(locationData);
        },
        (error) => {
          let message = 'Unable to get your location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access was denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
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

      return await response.json();
    } catch (error) {
      // Fallback to basic location description
      return {
        formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        city: 'Unknown',
        country: 'Unknown'
      };
    }
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
    if (!navigator.permissions) {
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      return 'prompt';
    }
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