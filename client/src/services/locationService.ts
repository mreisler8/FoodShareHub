interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  city?: string;
  country?: string;
}

interface LocationError {
  code: number;
  message: string;
}

class LocationService {
  private currentLocation: LocationData | null = null;
  private locationPromise: Promise<LocationData> | null = null;

  async getCurrentLocation(): Promise<LocationData> {
    // Return cached location if available and recent (within 5 minutes)
    if (this.currentLocation && this.isLocationRecent()) {
      return this.currentLocation;
    }

    // Return existing promise if location is being fetched
    if (this.locationPromise) {
      return this.locationPromise;
    }

    // Start new location fetch
    this.locationPromise = this.fetchLocation();

    try {
      const location = await this.locationPromise;
      this.currentLocation = { ...location, timestamp: Date.now() } as LocationData & { timestamp: number };
      return location;
    } catch (error) {
      console.error('Location fetch failed:', error);
      // Clear the promise on error so we can retry
      this.locationPromise = null;
      throw error;
    }
  }

  private async fetchLocation(): Promise<LocationData> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          try {
            // Try to get city/country from reverse geocoding
            const locationData: LocationData = {
              lat: latitude,
              lng: longitude,
              accuracy,
            };

            // Add reverse geocoding to get city/country
            const cityInfo = await this.reverseGeocode(latitude, longitude);
            if (cityInfo) {
              locationData.city = cityInfo.city;
              locationData.country = cityInfo.country;
            }

            resolve(locationData);
          } catch (error) {
            // Return basic location data even if reverse geocoding fails
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy,
            });
          }
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
          };
          reject(locationError);
        },
        options
      );
    });
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{ city?: string; country?: string } | null> {
    try {
      // Use a simple reverse geocoding service (you could use Google Maps API here too)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      return {
        city: data.city || data.locality || data.principalSubdivision,
        country: data.countryName,
      };
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  }

  private isLocationRecent(): boolean {
    if (!this.currentLocation) return false;
    const location = this.currentLocation as LocationData & { timestamp?: number };
    if (!location.timestamp) return false;

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return location.timestamp > fiveMinutesAgo;
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access denied by user';
      case 2:
        return 'Location information is unavailable';
      case 3:
        return 'Location request timed out';
      default:
        return 'An unknown error occurred while retrieving location';
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      // Try to get location to test if permission is granted
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      console.error('Location permission denied:', error);
      return false;
    }
  }

  clearLocationCache(): void {
    this.currentLocation = null;
    this.locationPromise = null;
  }
}

// Cache for location data
let cachedLocation: LocationData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const locationService = {
  async getCurrentLocation(): Promise<LocationData> {
    // Return cached location if still valid
    if (cachedLocation && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedLocation;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          // Cache the location
          cachedLocation = location;
          cacheTimestamp = Date.now();

          resolve(location);
        },
        (error) => {
          // Handle specific error types
          let errorMessage = 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  },

  // Clear cached location
  clearCache(): void {
    cachedLocation = null;
    cacheTimestamp = 0;
  }
};
export type { LocationData, LocationError };
export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

export class LocationService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_AGE = 300000; // 5 minutes
  private static cachedLocation: LocationData | null = null;
  private static lastLocationUpdate: number = 0;

  // Get current location with graceful permission handling
  static async getCurrentLocation(): Promise<LocationData | LocationError> {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      return {
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser'
      };
    }

    // Return cached location if recent
    const now = Date.now();
    if (this.cachedLocation && (now - this.lastLocationUpdate) < this.MAX_AGE) {
      return this.cachedLocation;
    }

    return new Promise((resolve) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: this.TIMEOUT,
        maximumAge: this.MAX_AGE
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Try to get address from reverse geocoding
          try {
            const addressData = await this.reverseGeocode(locationData.lat, locationData.lng);
            Object.assign(locationData, addressData);
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }

          this.cachedLocation = locationData;
          this.lastLocationUpdate = now;
          resolve(locationData);
        },
        (error) => {
          let errorCode: LocationError['code'];
          let errorMessage: string;

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorCode = 'PERMISSION_DENIED';
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorCode = 'POSITION_UNAVAILABLE';
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorCode = 'TIMEOUT';
              errorMessage = 'Location request timed out';
              break;
            default:
              errorCode = 'POSITION_UNAVAILABLE';
              errorMessage = 'Unknown location error';
          }

          resolve({ code: errorCode, message: errorMessage });
        },
        options
      );
    });
  }

  // Request location permission gracefully
  static async requestLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      // Fallback: try to get location directly
      const result = await this.getCurrentLocation();
      return 'code' in result ? 'denied' : 'granted';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      console.warn('Permission query failed:', error);
      return 'prompt';
    }
  }

  // Reverse geocode coordinates to address
  private static async reverseGeocode(lat: number, lng: number): Promise<Partial<LocationData>> {
    try {
      const response = await fetch(
        `/api/location/reverse?lat=${lat}&lng=${lng}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          address: data.address,
          city: data.city,
          country: data.country
        };
      }
    } catch (error) {
      console.error('Reverse geocoding API error:', error);
    }
    
    return {};
  }

  // Get city suggestions for manual input
  static async getCitySuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return [];

    try {
      const response = await fetch(
        `/api/location/cities?q=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.cities || [];
      }
    } catch (error) {
      console.error('City suggestions API error:', error);
    }
    
    return [];
  }

  // Calculate distance between two points
  static calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Clear cached location
  static clearCache(): void {
    this.cachedLocation = null;
    this.lastLocationUpdate = 0;
  }
}
