
import { db } from "../db";
import { searchAnalytics } from "../../shared/schema";

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

interface CityData {
  name: string;
  lat: number;
  lng: number;
  state?: string;
  country: string;
}

class LocationService {
  private static instance: LocationService;
  private cityCache = new Map<string, CityData>();
  private reverseGeocodeCache = new Map<string, LocationData>();
  
  // Major cities database for fallback
  private readonly majorCities: CityData[] = [
    { name: "New York", lat: 40.7128, lng: -74.0060, state: "NY", country: "US" },
    { name: "Los Angeles", lat: 34.0522, lng: -118.2437, state: "CA", country: "US" },
    { name: "Chicago", lat: 41.8781, lng: -87.6298, state: "IL", country: "US" },
    { name: "Houston", lat: 29.7604, lng: -95.3698, state: "TX", country: "US" },
    { name: "Phoenix", lat: 33.4484, lng: -112.0740, state: "AZ", country: "US" },
    { name: "Philadelphia", lat: 39.9526, lng: -75.1652, state: "PA", country: "US" },
    { name: "San Antonio", lat: 29.4241, lng: -98.4936, state: "TX", country: "US" },
    { name: "San Diego", lat: 32.7157, lng: -117.1611, state: "CA", country: "US" },
    { name: "Dallas", lat: 32.7767, lng: -96.7970, state: "TX", country: "US" },
    { name: "San Jose", lat: 37.3382, lng: -121.8863, state: "CA", country: "US" },
    { name: "Austin", lat: 30.2672, lng: -97.7431, state: "TX", country: "US" },
    { name: "Jacksonville", lat: 30.3322, lng: -81.6557, state: "FL", country: "US" },
    { name: "Fort Worth", lat: 32.7555, lng: -97.3308, state: "TX", country: "US" },
    { name: "Columbus", lat: 39.9612, lng: -82.9988, state: "OH", country: "US" },
    { name: "Charlotte", lat: 35.2271, lng: -80.8431, state: "NC", country: "US" },
    { name: "San Francisco", lat: 37.7749, lng: -122.4194, state: "CA", country: "US" },
    { name: "Indianapolis", lat: 39.7684, lng: -86.1581, state: "IN", country: "US" },
    { name: "Seattle", lat: 47.6062, lng: -122.3321, state: "WA", country: "US" },
    { name: "Denver", lat: 39.7392, lng: -104.9903, state: "CO", country: "US" },
    { name: "Boston", lat: 42.3601, lng: -71.0589, state: "MA", country: "US" },
    // Canadian cities
    { name: "Toronto", lat: 43.6532, lng: -79.3832, state: "ON", country: "CA" },
    { name: "Montreal", lat: 45.5017, lng: -73.5673, state: "QC", country: "CA" },
    { name: "Vancouver", lat: 49.2827, lng: -123.1207, state: "BC", country: "CA" },
    { name: "Calgary", lat: 51.0447, lng: -114.0719, state: "AB", country: "CA" },
    { name: "Edmonton", lat: 53.5461, lng: -113.4938, state: "AB", country: "CA" },
    { name: "Ottawa", lat: 45.4215, lng: -75.6972, state: "ON", country: "CA" },
    { name: "Winnipeg", lat: 49.8951, lng: -97.1384, state: "MB", country: "CA" },
    { name: "Quebec City", lat: 46.8139, lng: -71.2080, state: "QC", country: "CA" },
    // International cities
    { name: "London", lat: 51.5074, lng: -0.1278, country: "GB" },
    { name: "Paris", lat: 48.8566, lng: 2.3522, country: "FR" },
    { name: "Tokyo", lat: 35.6762, lng: 139.6503, country: "JP" },
    { name: "Sydney", lat: -33.8688, lng: 151.2093, country: "AU" },
    { name: "Berlin", lat: 52.5200, lng: 13.4050, country: "DE" },
    { name: "Madrid", lat: 40.4168, lng: -3.7038, country: "ES" },
    { name: "Rome", lat: 41.9028, lng: 12.4964, country: "IT" },
    { name: "Amsterdam", lat: 52.3676, lng: 4.9041, country: "NL" },
  ];

  constructor() {
    this.initializeCityCache();
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private initializeCityCache() {
    for (const city of this.majorCities) {
      this.cityCache.set(city.name.toLowerCase(), city);
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            const locationData = await this.reverseGeocode(latitude, longitude);
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy,
              ...locationData,
            });
          } catch (error) {
            // Return basic location even if reverse geocoding fails
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy,
            });
          }
        },
        (error) => {
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
        options
      );
    });
  }

  async reverseGeocode(lat: number, lng: number): Promise<Partial<LocationData>> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    if (this.reverseGeocodeCache.has(cacheKey)) {
      return this.reverseGeocodeCache.get(cacheKey)!;
    }

    try {
      // Use BigDataCloud free reverse geocoding API
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      const locationData = {
        city: data.city || data.locality || data.principalSubdivision,
        state: data.principalSubdivision,
        country: data.countryName,
        address: data.locality ? `${data.locality}, ${data.principalSubdivision}, ${data.countryName}` : undefined,
      };

      this.reverseGeocodeCache.set(cacheKey, locationData);
      return locationData;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {};
    }
  }

  searchCities(query: string): CityData[] {
    const queryLower = query.toLowerCase();
    const results: CityData[] = [];
    
    for (const city of this.majorCities) {
      if (city.name.toLowerCase().includes(queryLower)) {
        results.push(city);
      }
    }
    
    return results.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase().startsWith(queryLower);
      const bExact = b.name.toLowerCase().startsWith(queryLower);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return a.name.localeCompare(b.name);
    }).slice(0, 10);
  }

  getCityByName(cityName: string): CityData | null {
    return this.cityCache.get(cityName.toLowerCase()) || null;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async logLocationUsage(userId: number | null, query: string, lat?: number, lng?: number) {
    try {
      await db.insert(searchAnalytics).values({
        userId,
        query,
        category: 'location',
        resultCount: 1,
        clicked: false,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log location usage:', error);
    }
  }

  // Get popular cities based on search analytics
  async getPopularCities(limit: number = 10): Promise<string[]> {
    try {
      const result = await db
        .select({
          city: searchAnalytics.query,
          count: sql<number>`count(*)`,
        })
        .from(searchAnalytics)
        .where(eq(searchAnalytics.category, 'location'))
        .groupBy(searchAnalytics.query)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

      return result.map(r => r.city);
    } catch (error) {
      console.error('Failed to get popular cities:', error);
      return ['New York', 'Los Angeles', 'Chicago', 'Toronto', 'London'];
    }
  }

  clearCache() {
    this.reverseGeocodeCache.clear();
  }
}

export const locationService = LocationService.getInstance();
export type { LocationData, CityData };
