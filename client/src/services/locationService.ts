
interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  address?: string;
}

class LocationError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'LocationError';
  }
}

export class LocationService {
  private static instance: LocationService;
  private cache: Map<string, { data: LocationData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new LocationError('GEOLOCATION_NOT_SUPPORTED', 'Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          // Try to get user-friendly location name using reverse geocoding
          try {
            const city = await this.reverseGeocode(locationData.lat, locationData.lng);
            locationData.city = city;
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
            // Fall back to coordinates if reverse geocoding fails
          }
          
          resolve(locationData);
        },
        (error) => {
          let locationError: LocationError;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationError = new LocationError('PERMISSION_DENIED', 'Location access denied by user. Please enable location in your browser settings.');
              break;
            case error.POSITION_UNAVAILABLE:
              locationError = new LocationError('POSITION_UNAVAILABLE', 'Location information is unavailable. Please check your GPS or internet connection.');
              break;
            case error.TIMEOUT:
              locationError = new LocationError('TIMEOUT', 'Location request timed out. Please try again.');
              break;
            default:
              locationError = new LocationError('UNKNOWN_ERROR', 'An unknown error occurred while getting your location.');
              break;
          }
          reject(locationError);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const cacheKey = `reverse_${lat}_${lng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data.city || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }

    try {
      // Use Google Geocoding API for reverse geocoding
      const response = await fetch(
        `/api/geocode/reverse?lat=${lat}&lng=${lng}`
      );

      if (!response.ok) {
        throw new Error('Geocoding API request failed');
      }

      const data = await response.json();
      
      if (data.city) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: { lat, lng, city: data.city },
          timestamp: Date.now()
        });
        
        return data.city;
      }
      
      throw new Error('No results from geocoding');
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
  }

  getCachedLocation(key: string): LocationData | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setCachedLocation(key: string, data: LocationData): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export { LocationData, LocationError };
