
import React, { useState, useEffect } from 'react';
import { MapPin, Settings, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { locationService, type LocationData } from '@/services/locationService';

interface LocationControlsProps {
  onLocationChange?: (location: LocationData | null) => void;
}

export function LocationControls({ onLocationChange }: LocationControlsProps) {
  const [isEnabled, setIsEnabled] = useState(locationService.isLocationEnabled());
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [displayInfo, setDisplayInfo] = useState<{
    displayText: string;
    accuracy: 'high' | 'medium' | 'low';
    lastUpdated: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      refreshLocation();
    } else {
      const manual = locationService.getManualLocation();
      if (manual) {
        setCurrentLocation(manual);
        setDisplayInfo({
          displayText: `${manual.city || 'Manual Location'}`,
          accuracy: 'medium',
          lastUpdated: 'Manual'
        });
      }
    }
  }, [isEnabled]);

  const refreshLocation = async () => {
    if (!isEnabled) return;
    
    setIsLoading(true);
    try {
      const locationWithDisplay = await locationService.getCurrentLocationWithDisplay();
      setCurrentLocation(locationWithDisplay);
      setDisplayInfo({
        displayText: locationWithDisplay.displayText,
        accuracy: locationWithDisplay.accuracy,
        lastUpdated: locationWithDisplay.lastUpdated
      });
      onLocationChange?.(locationWithDisplay);
    } catch (error) {
      console.error('Location refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLocation = (enabled: boolean) => {
    setIsEnabled(enabled);
    locationService.setLocationEnabled(enabled);
    
    if (!enabled) {
      setCurrentLocation(null);
      setDisplayInfo(null);
      onLocationChange?.(null);
    }
  };

  const getAccuracyColor = (accuracy: 'high' | 'medium' | 'low') => {
    switch (accuracy) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <MapPin className={`h-4 w-4 ${isEnabled && currentLocation ? 'text-blue-600' : 'text-gray-400'}`} />
      
      {isEnabled && displayInfo ? (
        <div className="flex items-center gap-2">
          <span className="font-medium">{displayInfo.displayText}</span>
          <span className={`text-xs ${getAccuracyColor(displayInfo.accuracy)}`}>
            •
          </span>
          <span className="text-xs text-gray-500">{displayInfo.lastUpdated}</span>
        </div>
      ) : (
        <span className="text-gray-500">Location disabled</span>
      )}

      <div className="flex items-center gap-1">
        {isEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshLocation}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}

        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Location Settings</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Use my location</p>
                  <p className="text-xs text-gray-500">
                    Get more accurate restaurant recommendations
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={toggleLocation} />
              </div>

              {!isEnabled && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  Location services are disabled. Restaurant suggestions will be less personalized.
                </div>
              )}

              {isEnabled && displayInfo && (
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className={getAccuracyColor(displayInfo.accuracy)}>
                      {displayInfo.accuracy.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Last updated:</span>
                    <span>{displayInfo.lastUpdated}</span>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
