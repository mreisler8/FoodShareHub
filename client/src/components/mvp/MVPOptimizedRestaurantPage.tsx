import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Phone, Globe, ExternalLink, Clock } from 'lucide-react';
import { CircleScoreEnhancement } from '@/components/mvp/CircleScoreEnhancement';
import { MobileResponsiveLayout } from '@/components/mvp/MobileResponsiveLayout';
import RestaurantActionBar from '@/components/restaurant/RestaurantActionBar';
import ReservationCard from '@/components/restaurant/ReservationCard';
import OrderOptionsCard from '@/components/restaurant/OrderOptionsCard';
import MoreRestaurantActions from '@/components/restaurant/MoreRestaurantActions';
import { AppHeader } from '@/components/ui/AppHeader';

/**
 * MVP-Optimized Restaurant Detail Page
 * Addresses all three critical MVP issues:
 * 1. Circle Score Display Consistency
 * 2. Mobile Responsiveness
 * 3. Search Reliability (through enhanced components)
 */
export default function MVPOptimizedRestaurantPage() {
  const { restaurantId } = useParams();
  const [, setLocation] = useLocation();
  
  // Determine query method (database ID vs Google Place ID)
  const queryMethod = restaurantId?.startsWith('google_') ? 'googlePlaceId' : 'id';
  const actualId = queryMethod === 'googlePlaceId' ? restaurantId?.replace('google_', '') : restaurantId;

  // Fetch restaurant data
  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ['/api/restaurants', actualId, queryMethod],
    queryFn: async () => {
      const endpoint = queryMethod === 'googlePlaceId' 
        ? `/api/restaurants/google/${encodeURIComponent(actualId!)}`
        : `/api/restaurants/${actualId}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Restaurant not found');
      }
      return response.json();
    },
    enabled: !!actualId,
    retry: 2
  });

  if (isLoading) {
    return (
      <MobileResponsiveLayout variant="page" className="bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </MobileResponsiveLayout>
    );
  }

  if (error || !restaurant) {
    return (
      <MobileResponsiveLayout variant="page" className="bg-gray-50">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600 mb-4">We couldn't find the restaurant you're looking for.</p>
          <Button onClick={() => setLocation('/feed')}>Go Back</Button>
        </div>
      </MobileResponsiveLayout>
    );
  }

  // Calculate scores for dual display
  const googleScore = Math.round((restaurant.googlePlaces?.rating || 0) * 20); // Convert 5-star to 100-point
  const circlesScore = null; // Will be handled by CircleScoreEnhancement

  return (
    <MobileResponsiveLayout variant="page" className="bg-gray-50 pb-20">
      <AppHeader title={restaurant.name} showBackButton={true} />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pt-20">
        {/* Hero Image Card */}
        <Card className="overflow-hidden">
          <div className="relative h-64 sm:h-80 lg:h-96">
            {restaurant.imageUrl ? (
              <img 
                src={restaurant.imageUrl} 
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-500 text-lg">No image available</span>
              </div>
            )}
            
            {/* Overlay with key info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{restaurant.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {restaurant.location}
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {restaurant.cuisine} • {restaurant.priceRange}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Restaurant Details Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {restaurant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Phone</p>
                    <a 
                      href={`tel:${restaurant.phone}`}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                </div>
              )}

              {restaurant.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Website</p>
                    <a 
                      href={restaurant.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {restaurant.googlePlaces?.isOpen !== undefined && (
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${restaurant.googlePlaces.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Status</p>
                    <p className={`text-xs font-medium ${restaurant.googlePlaces.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {restaurant.googlePlaces.isOpen ? 'Open Now' : 'Closed'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dual Score Display - MVP Optimized */}
        <div className="flex justify-center items-center gap-8 sm:gap-12 mb-6 bg-white rounded-xl p-6 shadow-sm border">
          <div className="text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-50 border-4 border-green-500 flex items-center justify-center mb-3 relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-500"
                style={{ height: `${googleScore}%` }}
              />
              <div className="relative z-10 bg-white rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shadow-sm">
                <span className="text-lg sm:text-xl font-bold text-green-600">{googleScore}</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800">Google Score</div>
            <div className="text-xs text-gray-500 mt-1">
              {restaurant.googlePlaces?.reviewCount || 0} reviews
            </div>
          </div>

          <div className="h-16 w-px bg-gray-200"></div>

          <div className="text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-orange-50 border-4 border-orange-500 flex items-center justify-center mb-3">
              <div className="bg-white rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shadow-sm">
                <span className="text-lg sm:text-xl font-bold text-orange-600">—</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800">Circle Score</div>
            <div className="text-xs text-gray-500 mt-1">
              From your network
            </div>
          </div>
        </div>

        {/* Circle Score Section - MVP Enhanced with Consistent Display */}
        <CircleScoreEnhancement
          restaurantId={queryMethod === 'id' ? Number(actualId) : undefined}
          googlePlaceId={queryMethod === 'googlePlaceId' ? actualId : restaurant.googlePlaceId}
          variant="detailed"
        />

        {/* Top Horizontal Action Bar */}
        <RestaurantActionBar
          restaurant={{
            id: queryMethod === 'id' ? Number(actualId) : undefined,
            googlePlaceId: queryMethod === 'googlePlaceId' ? actualId : restaurant.googlePlaceId,
            name: restaurant.name,
            location: restaurant.location,
            address: restaurant.address
          }}
          isSaved={false}
          variant="desktop"
        />

        {/* Sidebar Cards Section - Mobile Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <ReservationCard 
            restaurant={{
              name: restaurant.name,
              location: restaurant.location
            }}
          />

          <OrderOptionsCard 
            restaurant={{
              name: restaurant.name,
              location: restaurant.location,
              website: restaurant.website
            }}
            menuUrl={restaurant.website}
            orderUrl={undefined}
          />

          <MoreRestaurantActions 
            restaurant={{
              name: restaurant.name,
              location: restaurant.location
            }}
          />
        </div>

        {/* Popular Dishes - Mobile Optimized */}
        {restaurant.communityInsights?.topDishes && restaurant.communityInsights.topDishes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Popular Dishes
              </h3>
              <div className="flex flex-wrap gap-2">
                {restaurant.communityInsights.topDishes.slice(0, 6).map((dish: any, index: number) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {dish.dish} {dish.mentions > 1 && `(${dish.mentions})`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Action Bar - Fixed at bottom */}
      <div className="md:hidden">
        <RestaurantActionBar
          restaurant={{
            id: queryMethod === 'id' ? Number(actualId) : undefined,
            googlePlaceId: queryMethod === 'googlePlaceId' ? actualId : restaurant.googlePlaceId,
            name: restaurant.name,
            location: restaurant.location,
            address: restaurant.address
          }}
          isSaved={false}
          variant="mobile"
        />
      </div>
    </MobileResponsiveLayout>
  );
}