
export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  city?: string;
  country?: string;
  address?: string;
  source: 'gps' | 'manual' | 'cached';
}

export interface LocationError {
  code: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported';
  message: string;
  canFallback: boolean;
}

interface ManualLocationOption {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
}

// Popular cities for manual selection
const POPULAR_CITIES: ManualLocationOption[] = [
  { id: 'toronto', name: 'Toronto, ON', lat: 43.6532, lng: -79.3832, country: 'Canada' },
  { id: 'vancouver', name: 'Vancouver, BC', lat: 49.2827, lng: -123.1207, country: 'Canada' },
  { id: 'montreal', name: 'Montreal, QC', lat: 45.5017, lng: -73.5673, country: 'Canada' },
  { id: 'nyc', name: 'New York, NY', lat: 40.7128, lng: -74.0060, country: 'USA' },
  { id: 'la', name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, country: 'USA' },
  { id: 'chicago', name: 'Chicago, IL', lat: 41.8781, lng: -87.6298, country: 'USA' },
  { id: 'london', name: 'London, UK', lat: 51.5074, lng: -0.1278, country: 'UK' },
  { id: 'paris', name: 'Paris, France', lat: 48.8566, lng: 2.3522, country: 'France' },
  { id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, country: 'Japan' },
];

class EnhancedLocationService {
  private currentLocation: LocationData | null = null;
  private locationPromise: Promise<LocationData> | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'circles_user_location';

  async getCurrentLocation(allowManualFallback = true): Promise<LocationData> {
    // Return cached location if available and recent
    if (this.currentLocation && this.isLocationRecent()) {
      return this.currentLocation;
    }

    // Check localStorage for manual location
    const storedLocation = this.getStoredLocation();
    if (storedLocation) {
      this.currentLocation = storedLocation;
      return storedLocation;
    }

    // Return existing promise if location is being fetched
    if (this.locationPromise) {
      return this.locationPromise;
    }

    // Start new location fetch
    this.locationPromise = this.fetchGPSLocation();

    try {
      const location = await this.locationPromise;
      this.currentLocation = { ...location, timestamp: Date.now() } as LocationData & { timestamp: number };
      return location;
    } catch (error) {
      console.error('GPS location fetch failed:', error);
      this.locationPromise = null;
      
      if (allowManualFallback) {
        throw new LocationError({
          code: 'permission_denied',
          message: 'GPS access denied. Please select your city manually.',
          canFallback: true,
        });
      }
      throw error;
    }
  }

  async requestLocationPermission(): Promise<{ granted: boolean; error?: LocationError }> {
    try {
      const position = await this.getCurrentLocation(false);
      return { granted: true };
    } catch (error: any) {
      const locationError: LocationError = {
        code: this.mapErrorCode(error.code),
        message: this.getErrorMessage(error.code),
        canFallback: true,
      };
      return { granted: false, error: locationError };
    }
  }

  async setManualLocation(cityId: string): Promise<LocationData> {
    const city = POPULAR_CITIES.find(c => c.id === cityId);
    if (!city) {
      throw new Error('Invalid city selection');
    }

    const location: LocationData = {
      lat: city.lat,
      lng: city.lng,
      city: city.name,
      country: city.country,
      source: 'manual',
    };

    // Store in localStorage and cache
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      ...location,
      timestamp: Date.now(),
    }));

    this.currentLocation = location;
    return location;
  }

  async searchCities(query: string): Promise<ManualLocationOption[]> {
    const lowerQuery = query.toLowerCase();
    
    // First, filter popular cities
    const popularMatches = POPULAR_CITIES.filter(city =>
      city.name.toLowerCase().includes(lowerQuery)
    );

    if (popularMatches.length > 0) {
      return popularMatches;
    }

    // If no popular cities match, try geocoding API
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place&access_token=${process.env.MAPBOX_API_KEY}`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      
      return data.features?.slice(0, 5).map((feature: any) => ({
        id: feature.id,
        name: feature.place_name,
        lat: feature.center[1],
        lng: feature.center[0],
        country: feature.context?.find((c: any) => c.id.startsWith('country'))?.text || 'Unknown',
      })) || [];
    } catch (error) {
      console.error('City search failed:', error);
      return [];
    }
  }

  getPopularCities(): ManualLocationOption[] {
    return POPULAR_CITIES;
  }

  clearLocationCache(): void {
    this.currentLocation = null;
    this.locationPromise = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  isLocationServiceAvailable(): boolean {
    return 'geolocation' in navigator;
  }

  private async fetchGPSLocation(): Promise<LocationData> {
    if (!navigator.geolocation) {
      throw new LocationError({
        code: 'not_supported',
        message: 'Geolocation is not supported by this browser',
        canFallback: true,
      });
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
            // Get city/country from reverse geocoding
            const locationData: LocationData = {
              lat: latitude,
              lng: longitude,
              accuracy,
              source: 'gps',
            };

            const cityInfo = await this.reverseGeocode(latitude, longitude);
            if (cityInfo) {
              locationData.city = cityInfo.city;
              locationData.country = cityInfo.country;
              locationData.address = cityInfo.address;
            }

            resolve(locationData);
          } catch (error) {
            // Return basic location data even if reverse geocoding fails
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy,
              source: 'gps',
            });
          }
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{ city?: string; country?: string; address?: string } | null> {
    try {
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
        address: data.localityInfo?.administrative?.[2]?.name || data.city,
      };
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  }

  private getStoredLocation(): LocationData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const location = parsed as LocationData & { timestamp: number };

      // Check if stored location is still fresh (24 hours)
      if (Date.now() - location.timestamp < 24 * 60 * 60 * 1000) {
        return {
          lat: location.lat,
          lng: location.lng,
          city: location.city,
          country: location.country,
          address: location.address,
          source: location.source,
        };
      }

      // Remove expired location
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    } catch (error) {
      console.error('Error reading stored location:', error);
      return null;
    }
  }

  private isLocationRecent(): boolean {
    if (!this.currentLocation) return false;
    const location = this.currentLocation as LocationData & { timestamp?: number };
    if (!location.timestamp) return false;

    return Date.now() - location.timestamp < this.CACHE_DURATION;
  }

  private mapErrorCode(code: number): LocationError['code'] {
    switch (code) {
      case 1: return 'permission_denied';
      case 2: return 'position_unavailable';
      case 3: return 'timeout';
      default: return 'not_supported';
    }
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access denied. Please enable location services or select your city manually.';
      case 2:
        return 'Location information is unavailable. Please select your city manually.';
      case 3:
        return 'Location request timed out. Please select your city manually.';
      default:
        return 'Location services are not available. Please select your city manually.';
    }
  }
}

class LocationError extends Error {
  code: LocationError['code'];
  canFallback: boolean;

  constructor({ code, message, canFallback }: { code: LocationError['code']; message: string; canFallback: boolean }) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
    this.canFallback = canFallback;
  }
}

export const enhancedLocationService = new EnhancedLocationService();
export { LocationError };
