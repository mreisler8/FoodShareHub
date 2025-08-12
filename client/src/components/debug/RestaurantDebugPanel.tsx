import React, { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';

interface DebugData {
  restaurantId?: number;
  googlePlaceId?: string;
  activeComponents: string[];
  ratingsData: {
    count: number;
    sources: string[];
    mismatches: number;
  };
  circleScoreData: {
    values: Array<{ widget: string; value: number | null; queryKey: string }>;
    inconsistencies: number;
  };
  fetchStats: {
    ratingsRequests: number;
    circleScoreRequests: number;
    totalRequests: number;
  };
}

interface RestaurantDebugPanelProps {
  restaurantId?: number;
  googlePlaceId?: string;
}

export function RestaurantDebugPanel({ restaurantId, googlePlaceId }: RestaurantDebugPanelProps) {
  const search = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<DebugData>({
    restaurantId,
    googlePlaceId,
    activeComponents: [],
    ratingsData: { count: 0, sources: [], mismatches: 0 },
    circleScoreData: { values: [], inconsistencies: 0 },
    fetchStats: { ratingsRequests: 0, circleScoreRequests: 0, totalRequests: 0 }
  });

  // Only show debug panel if ?debug=true is in URL
  const searchParams = new URLSearchParams(search);
  const isDebugMode = searchParams.get('debug') === 'true';

  useEffect(() => {
    if (!isDebugMode) return;

    // Collect debug information
    collectDebugData();
    
    // Set up periodic data collection
    const interval = setInterval(collectDebugData, 2000);
    return () => clearInterval(interval);
  }, [isDebugMode, restaurantId, googlePlaceId]);

  function collectDebugData() {
    // Scan for active rating/score components
    const activeComponents = scanActiveComponents();
    
    // Monitor React Query cache
    const fetchStats = analyzeFetchStats();
    
    setDebugData(prev => ({
      ...prev,
      restaurantId,
      googlePlaceId,
      activeComponents,
      fetchStats
    }));
  }

  function scanActiveComponents(): string[] {
    const components: string[] = [];
    
    // Look for rating-related components in the DOM
    const selectors = [
      '[data-testid*="rating"]',
      '[data-component*="Rating"]',
      '[data-component*="CircleScore"]',
      '[class*="rating"]',
      '[class*="circle-score"]'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const componentName = el.getAttribute('data-component') || 
                             el.getAttribute('data-testid') || 
                             el.className.split(' ').find(c => c.includes('rating') || c.includes('score')) ||
                             'Unknown Component';
        if (!components.includes(componentName)) {
          components.push(componentName);
        }
      });
    });
    
    return components;
  }

  function analyzeFetchStats() {
    // This would need to integrate with React Query cache inspection
    // For now, return mock data structure
    return {
      ratingsRequests: 0, // Would be collected from React Query
      circleScoreRequests: 0,
      totalRequests: 0
    };
  }

  if (!isDebugMode) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-red-50 border-b-2 border-red-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between p-2 text-red-800 hover:bg-red-100"
          >
            <div className="flex items-center gap-2">
              <Bug size={16} />
              <span className="font-medium">Restaurant Debug Panel</span>
              <Badge variant="destructive" className="text-xs">
                DEBUG MODE
              </Badge>
            </div>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 space-y-4 bg-red-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Identity Information */}
              <Card className="p-3">
                <h4 className="font-semibold text-sm mb-2">Identity</h4>
                <div className="text-xs space-y-1">
                  <div><strong>Restaurant ID:</strong> {debugData.restaurantId || 'N/A'}</div>
                  <div><strong>Google Place ID:</strong> {debugData.googlePlaceId || 'N/A'}</div>
                </div>
              </Card>

              {/* Active Components */}
              <Card className="p-3">
                <h4 className="font-semibold text-sm mb-2">Active Components ({debugData.activeComponents.length})</h4>
                <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                  {debugData.activeComponents.length > 0 ? (
                    debugData.activeComponents.map((comp, i) => (
                      <div key={i} className="truncate">{comp}</div>
                    ))
                  ) : (
                    <div className="text-gray-500">No rating components detected</div>
                  )}
                </div>
              </Card>

              {/* Fetch Statistics */}
              <Card className="p-3">
                <h4 className="font-semibold text-sm mb-2">Fetch Stats</h4>
                <div className="text-xs space-y-1">
                  <div><strong>Rating Requests:</strong> {debugData.fetchStats.ratingsRequests}</div>
                  <div><strong>Circle Score Requests:</strong> {debugData.fetchStats.circleScoreRequests}</div>
                  <div><strong>Total Requests:</strong> {debugData.fetchStats.totalRequests}</div>
                </div>
              </Card>
            </div>

            {/* Data Snapshot */}
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2">Data Snapshot (Read-Only)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <strong>Ratings Data:</strong>
                  <div className="mt-1 space-y-1">
                    <div>Count: {debugData.ratingsData.count}</div>
                    <div>Sources: {debugData.ratingsData.sources.join(', ') || 'None'}</div>
                    <div>Mismatches: {debugData.ratingsData.mismatches}</div>
                  </div>
                </div>
                <div>
                  <strong>Circle Score:</strong>
                  <div className="mt-1 space-y-1">
                    <div>Widgets: {debugData.circleScoreData.values.length}</div>
                    <div>Inconsistencies: {debugData.circleScoreData.inconsistencies}</div>
                    {debugData.circleScoreData.values.map((value, i) => (
                      <div key={i} className="text-xs">
                        {value.widget}: {value.value} (key: {value.queryKey})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Warnings */}
            {(debugData.ratingsData.mismatches > 0 || debugData.circleScoreData.inconsistencies > 0) && (
              <Card className="p-3 border-red-300 bg-red-100">
                <h4 className="font-semibold text-sm mb-2 text-red-800">⚠️ Data Integrity Warnings</h4>
                <div className="text-xs text-red-700 space-y-1">
                  {debugData.ratingsData.mismatches > 0 && (
                    <div>• {debugData.ratingsData.mismatches} rating(s) have restaurant ID mismatches</div>
                  )}
                  {debugData.circleScoreData.inconsistencies > 0 && (
                    <div>• {debugData.circleScoreData.inconsistencies} Circle Score inconsistency(ies) detected</div>
                  )}
                </div>
              </Card>
            )}

            <div className="text-xs text-gray-600 mt-2">
              Debug mode is active. Remove ?debug=true from URL to hide this panel.
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}