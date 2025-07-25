import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  MapPin, 
  User, 
  Heart,
  MessageCircle,
  Bookmark,
  Star,
  Users,
  Clock,
  ChefHat
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { LocationService } from '@/services/locationService';
import DiscoverItemRenderer from '@/components/discover/DiscoverItemRenderer';

interface DiscoverItem {
  id: string;
  type: "list" | "rating" | "post" | "restaurant";
  content: any;
  score: number;
  metadata: {
    author: { id: string; name: string; avatar?: string };
    createdAt: string;
    socialProof?: string;
    circleScore?: number;
    location?: { lat: number; lng: number };
  };
}

interface DiscoverResponse {
  items: DiscoverItem[];
  hasMore: boolean;
  totalCount: number;
}

type TabType = 'for-you' | 'trending' | 'near-you';

export default function DiscoverFeed() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('for-you');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Get user's location for "Near You" tab
  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state);
        
        if (permission.state === 'granted') {
          const locationService = LocationService.getInstance();
          const userLocation = await locationService.getCurrentLocation();
          if (userLocation) {
            setLocation({ lat: userLocation.lat, lng: userLocation.lng });
          }
        }
      } catch (error) {
        console.log('Location permission check failed:', error);
      }
    };

    checkLocationPermission();
  }, []);

  // Request location when "Near You" tab is selected
  const handleLocationRequest = async () => {
    try {
      const locationService = LocationService.getInstance();
      const userLocation = await locationService.getCurrentLocation();
      if (userLocation) {
        setLocation({ lat: userLocation.lat, lng: userLocation.lng });
        setLocationPermission('granted');
      }
    } catch (error) {
      console.error('Failed to get location:', error);
      setLocationPermission('denied');
    }
  };

  // Query for discover feed data
  const { data, isLoading, error, refetch } = useQuery<DiscoverResponse>({
    queryKey: ['/api/discover', activeTab, location?.lat, location?.lng],
    queryFn: async () => {
      let url = `/api/discover/${activeTab}?limit=20&offset=0`;
      
      if (activeTab === 'near-you' && location) {
        url += `&lat=${location.lat}&lng=${location.lng}&radius=10000`;
      }
      
      return apiRequest(url);
    },
    enabled: activeTab !== 'near-you' || !!location,
    staleTime: activeTab === 'for-you' ? 30000 : activeTab === 'trending' ? 300000 : 120000,
    cacheTime: 600000
  });

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'for-you': return <User className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'near-you': return <MapPin className="w-4 h-4" />;
    }
  };

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'for-you': return 'For You';
      case 'trending': return 'Trending';
      case 'near-you': return 'Near You';
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-8 text-center">
          <CardContent>
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Welcome to Discover</h2>
            <p className="text-gray-600 mb-4">Sign in to see personalized food recommendations from your network</p>
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discover</h1>
          <p className="text-gray-600">Curated food experiences from your trusted network</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="for-you" className="flex items-center gap-2">
            {getTabIcon('for-you')}
            <span className="hidden sm:inline">{getTabTitle('for-you')}</span>
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            {getTabIcon('trending')}
            <span className="hidden sm:inline">{getTabTitle('trending')}</span>
          </TabsTrigger>
          <TabsTrigger value="near-you" className="flex items-center gap-2">
            {getTabIcon('near-you')}
            <span className="hidden sm:inline">{getTabTitle('near-you')}</span>
          </TabsTrigger>
        </TabsList>

        {/* For You Content */}
        <TabsContent value="for-you" className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState onRetry={refetch} />
          ) : !data?.items?.length ? (
            <EmptyForYouState />
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => (
                <DiscoverItemRenderer key={item.id} item={item} />
              ))}
              {data.hasMore && (
                <div className="text-center py-4">
                  <Button variant="outline">Load More</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Trending Content */}
        <TabsContent value="trending" className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState onRetry={refetch} />
          ) : !data?.items?.length ? (
            <EmptyTrendingState />
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => (
                <DiscoverItemRenderer key={item.id} item={item} />
              ))}
              {data.hasMore && (
                <div className="text-center py-4">
                  <Button variant="outline">Load More</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Near You Content */}
        <TabsContent value="near-you" className="space-y-4">
          {!location && locationPermission !== 'granted' ? (
            <LocationPermissionState 
              onRequestLocation={handleLocationRequest}
              permission={locationPermission}
            />
          ) : isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState onRetry={refetch} />
          ) : !data?.items?.length ? (
            <EmptyNearYouState />
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => (
                <DiscoverItemRenderer key={item.id} item={item} />
              ))}
              {data.hasMore && (
                <div className="text-center py-4">
                  <Button variant="outline">Load More</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start space-x-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Error state component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <CardContent>
        <div className="text-red-500 mb-4">
          <Users className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Unable to load feed</h3>
        <p className="text-gray-600 mb-4">There was a problem loading your discover feed. Please try again.</p>
        <Button onClick={onRetry}>Tap to retry</Button>
      </CardContent>
    </Card>
  );
}

// Empty state for For You tab
function EmptyForYouState() {
  return (
    <Card className="p-8 text-center">
      <CardContent>
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Follow foodies to see personalized content</h3>
        <p className="text-gray-600 mb-4">
          Your For You feed will show recommendations from people you follow and circles you join.
        </p>
        <div className="space-y-2">
          <Button onClick={() => window.location.href = '/explore'}>
            Find People to Follow
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/circles'}>
            Browse Circles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state for Trending tab
function EmptyTrendingState() {
  return (
    <Card className="p-8 text-center">
      <CardContent>
        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">No trending content right now</h3>
        <p className="text-gray-600 mb-4">
          Check back later to see what's trending in the food community.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/create'}>
          Share Something Tasty
        </Button>
      </CardContent>
    </Card>
  );
}

// Empty state for Near You tab
function EmptyNearYouState() {
  return (
    <Card className="p-8 text-center">
      <CardContent>
        <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">No local activity found</h3>
        <p className="text-gray-600 mb-4">
          No food recommendations found in your area. Try expanding your search or check back later.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/explore'}>
          Explore All Content
        </Button>
      </CardContent>
    </Card>
  );
}

// Location permission state
function LocationPermissionState({ 
  onRequestLocation, 
  permission 
}: { 
  onRequestLocation: () => void;
  permission: 'granted' | 'denied' | 'prompt';
}) {
  return (
    <Card className="p-8 text-center">
      <CardContent>
        <MapPin className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        <h3 className="text-lg font-semibold mb-2">Enable location for local recommendations</h3>
        <p className="text-gray-600 mb-4">
          {permission === 'denied' 
            ? 'Location access was denied. Please enable it in your browser settings to see local food recommendations.'
            : 'We need your location to show food recommendations near you.'
          }
        </p>
        {permission !== 'denied' && (
          <Button onClick={onRequestLocation}>
            <MapPin className="w-4 h-4 mr-2" />
            Enable Location
          </Button>
        )}
        {permission === 'denied' && (
          <Button variant="outline" onClick={() => window.location.href = '/explore'}>
            Browse All Content Instead
          </Button>
        )}
      </CardContent>
    </Card>
  );
}