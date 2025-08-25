
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';
import { LocationService, type LocationData } from '@/services/locationService';

const locationService = LocationService.getInstance();

interface CityData {
  name: string;
  lat: number;
  lng: number;
  state?: string;
  country: string;
}

interface LocationSearchInputProps {
  onLocationSelect: (location: LocationData) => void;
  onLocationClear: () => void;
  currentLocation?: LocationData | null;
  placeholder?: string;
  className?: string;
  showGPSButton?: boolean;
  showClearButton?: boolean;
}

export function LocationSearchInput({
  onLocationSelect,
  onLocationClear,
  currentLocation,
  placeholder = "Search city or use GPS",
  className = "",
  showGPSButton = true,
  showClearButton = true,
}: LocationSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popularCities, setPopularCities] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load popular cities on mount
    fetchPopularCities();

    // Handle click outside to close suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Debounced city search
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchCities(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const fetchPopularCities = async () => {
    try {
      const response = await fetch('/api/search/trending');
      const data = await response.json();
      if (data.popularCities) {
        setPopularCities(data.popularCities);
      }
    } catch (error) {
      console.error('Failed to fetch popular cities:', error);
    }
  };

  const searchCities = async (query: string) => {
    setIsSearching(true);
    try {
      // For now, use a simple local search
      // In production, you'd want to use a geocoding service
      const mockCities: CityData[] = [
        { name: "New York", lat: 40.7128, lng: -74.0060, state: "NY", country: "US" },
        { name: "Los Angeles", lat: 34.0522, lng: -118.2437, state: "CA", country: "US" },
        { name: "Chicago", lat: 41.8781, lng: -87.6298, state: "IL", country: "US" },
        { name: "Toronto", lat: 43.6532, lng: -79.3832, state: "ON", country: "CA" },
        { name: "Montreal", lat: 45.5017, lng: -73.5673, state: "QC", country: "CA" },
        { name: "Vancouver", lat: 49.2827, lng: -123.1207, state: "BC", country: "CA" },
        { name: "London", lat: 51.5074, lng: -0.1278, country: "GB" },
        { name: "Paris", lat: 48.8566, lng: 2.3522, country: "FR" },
        { name: "Tokyo", lat: 35.6762, lng: 139.6503, country: "JP" },
        { name: "Sydney", lat: -33.8688, lng: 151.2093, country: "AU" },
      ];

      const filtered = mockCities.filter(city =>
        city.name.toLowerCase().includes(query.toLowerCase())
      );

      setSuggestions(filtered);
      setShowSuggestions(true);
    } catch (error) {
      console.error('City search failed:', error);
      setError('Failed to search cities');
    } finally {
      setIsSearching(false);
    }
  };

  const handleGPSLocation = async () => {
    setIsGettingLocation(true);
    setError(null);

    try {
      const location = await locationService.getCurrentLocation();
      onLocationSelect(location);
      
      // Update input to show current location
      if (location.city) {
        setSearchQuery(location.city);
      } else {
        setSearchQuery(`${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`);
      }
      setShowSuggestions(false);
      setError(null); // Clear any previous errors
    } catch (error: any) {
      console.error('GPS location failed:', error);
      const errorMessage = error?.message || error?.code || 'Location access failed. Please try again or search manually.';
      setError(errorMessage);
      
      // If permission denied, provide helpful guidance
      if (error?.code === 'PERMISSION_DENIED') {
        setError('Location access blocked. Please click the location icon in your browser address bar to enable location access, then try again.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCitySelect = (city: CityData) => {
    const location: LocationData = {
      lat: city.lat,
      lng: city.lng,
      city: city.name,
      state: city.state,
      country: city.country,
    };

    onLocationSelect(location);
    setSearchQuery(city.name);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    onLocationClear();
  };

  const handleInputFocus = () => {
    if (searchQuery.length >= 2) {
      setShowSuggestions(true);
    } else if (popularCities.length > 0) {
      // Show popular cities when focused with no query
      const mockPopular: CityData[] = popularCities.slice(0, 5).map(city => ({
        name: city,
        lat: 0, lng: 0, country: "US" // Would be properly geocoded in production
      }));
      setSuggestions(mockPopular);
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="pl-10 pr-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
          {showClearButton && (searchQuery || currentLocation) && !isSearching && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {showGPSButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGPSLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 px-3"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            GPS
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Current location display */}
      {currentLocation && !searchQuery && (
        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
          <MapPin className="h-3 w-3" />
          <span>
            {currentLocation.city ? 
              `${currentLocation.city}${currentLocation.state ? `, ${currentLocation.state}` : ''}` :
              `${currentLocation.lat.toFixed(2)}, ${currentLocation.lng.toFixed(2)}`
            }
          </span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card ref={suggestionsRef} className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border shadow-lg bg-white">
          <div className="p-2">
            {!searchQuery && popularCities.length > 0 && (
              <div className="mb-2 text-xs text-gray-500 px-2 py-1">
                Popular cities
              </div>
            )}
            {suggestions.map((city, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-auto p-2 text-left"
                onClick={() => handleCitySelect(city)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {city.name}
                    </div>
                    {city.state && (
                      <div className="text-xs text-gray-500">
                        {city.state}, {city.country}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
