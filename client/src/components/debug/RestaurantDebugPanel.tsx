import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DebugOriginProps {
  label: string;
  endpoint?: string;
  queryKey?: string[];
  restaurantId?: number;
  placeId?: string;
  lastFetch?: Date;
  status?: number;
  children: React.ReactNode;
}

interface RestaurantSnapshot {
  resolved: {
    restaurantId?: number;
    placeId?: string;
  };
  dbRow: any;
  userRatingByRestaurantId: any;
  userRatingByPlaceId: any;
  circleScore: any;
  featuredLists: {
    source: string;
    count: number;
  };
  testDataPresent: {
    ratings: number;
    details: any[];
  };
}

/**
 * DEBUG ORIGIN WRAPPER
 * Shows data source information only when ?debug=1
 */
export function DebugOrigin({ 
  label, 
  endpoint, 
  queryKey, 
  restaurantId, 
  placeId, 
  lastFetch, 
  status, 
  children 
}: DebugOriginProps) {
  const isDebugMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debug') === '1';

  if (!isDebugMode) {
    return <>{children}</>;
  }

  const getStatusColor = (status?: number) => {
    if (!status) return 'secondary';
    if (status >= 200 && status < 300) return 'default';
    if (status >= 400) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="relative">
      {/* Original content */}
      {children}
      
      {/* Debug overlay */}
      <div className="absolute top-0 right-0 z-50">
        <Card className="bg-yellow-50 border-yellow-300 text-xs min-w-[200px] shadow-lg">
          <CardContent className="p-2 space-y-1">
            <div className="font-semibold text-yellow-800">{label}</div>
            {endpoint && (
              <div>
                <span className="text-gray-600">Endpoint:</span>
                <div className="font-mono text-yellow-700">{endpoint}</div>
              </div>
            )}
            {queryKey && (
              <div>
                <span className="text-gray-600">Query Key:</span>
                <div className="font-mono text-yellow-700">
                  {JSON.stringify(queryKey)}
                </div>
              </div>
            )}
            <div className="flex gap-1 flex-wrap">
              {restaurantId && (
                <Badge variant="outline" className="text-xs">
                  ID: {restaurantId}
                </Badge>
              )}
              {placeId && (
                <Badge variant="outline" className="text-xs">
                  Place: {placeId.substring(0, 8)}...
                </Badge>
              )}
              {status && (
                <Badge variant={getStatusColor(status)} className="text-xs">
                  {status}
                </Badge>
              )}
            </div>
            {lastFetch && (
              <div className="text-xs text-gray-500">
                {lastFetch.toLocaleTimeString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * RESTAURANT DEBUG PANEL
 * Main debug panel showing complete data snapshot
 */
export function RestaurantDebugPanel({ restaurantId, placeId }: { 
  restaurantId?: number; 
  placeId?: string; 
}) {
  const [snapshot, setSnapshot] = useState<RestaurantSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDebugMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debug') === '1';

  const fetchSnapshot = async () => {
    if (!restaurantId && !placeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (restaurantId) params.set('restaurantId', restaurantId.toString());
      if (placeId) params.set('placeId', placeId);
      
      const response = await fetch(`/api/_debug/restaurant-snapshot?${params}`);
      if (!response.ok) {
        throw new Error(`Debug snapshot failed: ${response.status}`);
      }
      
      const data = await response.json();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDebugMode) {
      fetchSnapshot();
    }
  }, [isDebugMode, restaurantId, placeId]);

  if (!isDebugMode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-red-50 border-red-300 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-red-800">🔍 Debug Panel</h3>
            <Button 
              onClick={fetchSnapshot} 
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          
          {error && (
            <div className="text-red-600 text-sm mb-2">
              Error: {error}
            </div>
          )}
          
          {snapshot && (
            <div className="space-y-3 text-xs">
              {/* Identity Resolution */}
              <div>
                <div className="font-semibold text-red-700">Identity Resolution</div>
                <div className="bg-white p-2 rounded border">
                  <div>Restaurant ID: {snapshot.resolved.restaurantId || 'None'}</div>
                  <div>Place ID: {snapshot.resolved.placeId?.substring(0, 12)}... || 'None'</div>
                </div>
              </div>
              
              {/* Rating Sources */}
              <div>
                <div className="font-semibold text-red-700">Rating Sources</div>
                <div className="bg-white p-2 rounded border">
                  <div>By Restaurant ID: {snapshot.userRatingByRestaurantId ? '✓' : '✗'}</div>
                  <div>By Place ID: {snapshot.userRatingByPlaceId ? '✓' : '✗'}</div>
                  {snapshot.userRatingByRestaurantId?.note?.includes('Villa di Roma') && (
                    <div className="text-red-600 font-semibold">⚠️ Villa di Roma contamination detected!</div>
                  )}
                </div>
              </div>
              
              {/* Circle Score */}
              <div>
                <div className="font-semibold text-red-700">Circle Score</div>
                <div className="bg-white p-2 rounded border">
                  {snapshot.circleScore?.error ? (
                    <div className="text-red-600">Error: {snapshot.circleScore.error}</div>
                  ) : (
                    <div>Score: {snapshot.circleScore?.score || 0}</div>
                  )}
                </div>
              </div>
              
              {/* Test Data */}
              {snapshot.testDataPresent.ratings > 0 && (
                <div>
                  <div className="font-semibold text-red-700">⚠️ Test Data Found</div>
                  <div className="bg-yellow-100 p-2 rounded border">
                    <div>{snapshot.testDataPresent.ratings} test ratings</div>
                    {snapshot.testDataPresent.details.map((detail, i) => (
                      <div key={i} className="text-xs">
                        • {detail.restaurantName} ({detail.note?.substring(0, 20)}...)
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Featured Lists */}
              <div>
                <div className="font-semibold text-red-700">Featured Lists</div>
                <div className="bg-white p-2 rounded border">
                  <div>Source: {snapshot.featuredLists.source}</div>
                  <div>Count: {snapshot.featuredLists.count}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}