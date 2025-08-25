import { useState, useCallback } from 'react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface LocationError {
  code: number;
  message: string;
}

export function useLocationService() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<LocationError | null>(null);

  const requestLocation = useCallback((): Promise<LocationData | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const error = { code: 0, message: 'Geolocation is not supported by this browser.' };
        setLocationError(error);
        resolve(null);
        return;
      }

      setIsLocationLoading(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(locationData);
          setIsLocationLoading(false);
          resolve(locationData);
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: error.message,
          };
          setLocationError(locationError);
          setIsLocationLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  return {
    location,
    isLocationLoading,
    locationError,
    requestLocation,
  };
}