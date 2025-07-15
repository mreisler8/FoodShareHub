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

let cachedLocation: LocationData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const LocationService = {
  // Get current location with caching
  async getCurrentLocation(): Promise<LocationData | null> {
    return new Promise((resolve, reject) => {
      // Check cache first
      const now = Date.now();
      if (cachedLocation && (now - cacheTimestamp) < CACHE_DURATION) {
        resolve(cachedLocation);
        return;
      }

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Cache the location
          cachedLocation = locationData;
          cacheTimestamp = now;
          
          resolve(locationData);
        },
        (error) => {
          let errorMessage: string;
          
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
            default:
              errorMessage = 'Unknown location error';
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