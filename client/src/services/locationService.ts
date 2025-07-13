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

export const locationService = new LocationService();
export type { LocationData, LocationError };