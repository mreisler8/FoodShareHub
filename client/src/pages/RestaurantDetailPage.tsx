import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Phone, 
  Globe, 
  Clock, 
  DollarSign, 
  UtensilsCrossed, 
  Share2,
  Plus,
  ExternalLink,
  ChefHat
} from 'lucide-react';
import QuickRateButton from '@/components/ratings/QuickRateButton';
import RatingDisplay from '@/components/ratings/RatingDisplay';
import CircleScoreCard from '@/components/circle-score/CircleScoreCard';
import { useCircleScore } from '@/hooks/useCircleScore';

// New modular components for the redesign
import TrustScoreSection from '@/components/restaurant/TrustScoreSection';
import ListMentionsSection from '@/components/restaurant/ListMentionsSection';
import SocialActivityFeed from '@/components/restaurant/SocialActivityFeed';
import RestaurantActionBar from '@/components/restaurant/RestaurantActionBar';

interface RestaurantDetails {
  id: string;
  name: string;
  location: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  category: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  imageUrl?: string;
  description?: string;
  googlePlaceId?: string;
  source: string;
  googlePlaces?: {
    rating: number;
    reviewCount: number;
    isOpen?: boolean;
    businessStatus?: string;
    isPermanentlyClosed: boolean;
    photos: Array<{
      reference: string;
      width: number;
      height: number;
    }>;
    reviews: Array<{
      rating: number;
      text: string;
      authorName: string;
      time: number;
    }>;
    priceLevel?: string;
  };
  communityInsights: {
    followersAverageRating: number | null;
    followersReviewCount: number;
    topDishes: Array<{
      dish: string;
      mentions: number;
    }>;
    recentPosts: Array<{
      id: number;
      content: string;
      rating: number;
      dishesTried: string[];
      images: string[];
      createdAt: string;
      priceAssessment?: string;
      atmosphere?: string;
      serviceRating?: number;
      dietaryOptions?: string[];
      author: {
        id: number;
        name: string;
        username: string;
      };
      likeCount: number;
      commentCount: number;
    }>;
    hasFollowersReviewed: boolean;
  };
}

// Circular Progress Component
const CircularProgress = ({ 
  percentage, 
  label, 
  color = "#3b82f6", 
  size = 80 
}: { 
  percentage: number; 
  label: string; 
  color?: string; 
  size?: number; 
}) => {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{percentage}%</span>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
};

export default function RestaurantDetailPage() {
  const { id, placeId } = useParams();
  const [location, setLocation] = useLocation();

  // Handle both path parameters and query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const googlePlaceId = urlParams.get('googlePlaceId');
  
  // Determine the restaurant identifier and query method
  let restaurantId: string | undefined;
  let queryMethod: 'id' | 'googlePlaceId' = 'id';
  
  if (placeId) {
    // URL format: /restaurants/google/:placeId
    restaurantId = placeId;
    queryMethod = 'googlePlaceId';
  } else if (googlePlaceId) {
    // URL format: /restaurants?googlePlaceId=...
    restaurantId = googlePlaceId;
    queryMethod = 'googlePlaceId';
  } else if (id) {
    // URL format: /restaurants/:id
    restaurantId = id;
    queryMethod = 'id';
  }

  // Add console log for debugging navigation
  console.log('RestaurantDetailPage params:', { id, placeId, googlePlaceId, restaurantId, queryMethod });

  const { data: restaurant, isLoading, error } = useQuery<RestaurantDetails>({
    queryKey: queryMethod === 'googlePlaceId' ? [`/api/restaurants?googlePlaceId=${restaurantId}`] : [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error('No restaurant ID provided');
      }
      
      let url: string;
      if (queryMethod === 'googlePlaceId') {
        url = `/api/restaurants?googlePlaceId=${encodeURIComponent(restaurantId)}`;
      } else {
        url = `/api/restaurants/${restaurantId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch restaurant details');
      }
      return response.json();
    },
  });

  // Fetch Circle Score for this restaurant
  const { data: circleScore, isLoading: isCircleScoreLoading } = useCircleScore({ 
    restaurantId: queryMethod === 'id' ? parseInt(restaurantId!) : undefined,
    googlePlaceId: queryMethod === 'googlePlaceId' ? restaurantId : undefined,
    enabled: !!restaurantId
  });

  // Fetch user's rating for this restaurant
  const { data: userRating, refetch: refetchRating } = useQuery({
    queryKey: [`/api/ratings/restaurant`, restaurantId, queryMethod],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return null;
      
      let url: string;
      if (queryMethod === 'googlePlaceId') {
        url = `/api/ratings/restaurant/${encodeURIComponent(restaurantId)}?type=google_place`;
      } else {
        url = `/api/ratings/restaurant/${restaurantId}?type=restaurant`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null; // No rating found
        throw new Error('Failed to fetch user rating');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-300 w-full"></div>
          <div className="p-6 space-y-4">
            <div className="h-8 bg-gray-300 rounded w-3/4"></div>
            <div className="flex gap-4">
              <div className="h-20 w-20 bg-gray-300 rounded-full"></div>
              <div className="h-20 w-20 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h2>
          <p className="text-gray-600 mb-4">The restaurant you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Calculate percentages for circular progress
  const googleScore = restaurant.googlePlaces?.rating 
    ? Math.round((restaurant.googlePlaces.rating / 5) * 100)
    : 0;
  
  const circlesScore = restaurant.communityInsights?.followersAverageRating 
    ? Math.round((restaurant.communityInsights.followersAverageRating / 5) * 100)
    : 0;

  // Get restaurant image URL - try multiple sources
  const heroImageUrl = restaurant.imageUrl || 
                       restaurant.images?.[0] || 
                       (restaurant.googlePlaces?.photos?.[0] ? 
                        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${restaurant.googlePlaces.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}` : 
                        null);

  // Mock data for lists and posts - in production, fetch from API
  const mockLists = [
    {
      id: 1,
      name: "Best Brunch in Toronto",
      description: "Weekend brunch spots that never disappoint",
      owner: { id: 2, name: "Riley Chen", username: "rileyeats" },
      itemCount: 12,
      isPublic: true,
      ranking: 2,
      tags: ["brunch", "toronto", "weekend"],
      createdAt: "2025-01-15T10:00:00Z"
    },
    {
      id: 2,
      name: "Hidden Gems",
      description: "Underrated spots worth visiting",
      owner: { id: 3, name: "Jason Bloom", username: "jasonbloom" },
      itemCount: 8,
      isPublic: false,
      ranking: 1,
      tags: ["hidden", "local"],
      createdAt: "2025-01-10T15:30:00Z"
    }
  ];

  const mockPosts = restaurant.communityInsights?.recentPosts || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/')}
          className="bg-white/90 backdrop-blur-sm hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Hero Section with enhanced mobile-first design */}
      <div className="relative h-48 md:h-64 w-full overflow-hidden">
        {heroImageUrl ? (
          <img 
            src={heroImageUrl} 
            alt={restaurant.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              // Show fallback
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div className={`w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center ${heroImageUrl ? 'hidden' : ''}`}>
          <ChefHat className="h-12 w-12 md:h-16 md:w-16 text-gray-600" />
        </div>
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Restaurant info overlay - mobile optimized */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {restaurant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{restaurant.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <UtensilsCrossed className="h-3 w-3" />
              <span>{restaurant.cuisine}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile-first modular layout */}
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        {/* Dual Score Display - Google vs Circle Score (Rotten Tomatoes Style) */}
        <div className="flex justify-center items-center gap-12 mb-6 bg-white rounded-xl p-6 shadow-sm border">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-green-50 border-4 border-green-500 flex items-center justify-center mb-3 relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-500"
                style={{ height: `${googleScore}%` }}
              />
              <div className="relative z-10 bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-green-600">{googleScore}</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800">Google Score</div>
            <div className="text-xs text-gray-500 mt-1">
              {restaurant.googlePlaces?.reviewCount || 0} reviews
            </div>
          </div>
          
          <div className="h-16 w-px bg-gray-200"></div>
          
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-orange-50 border-4 border-orange-500 flex items-center justify-center mb-3 relative overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-orange-500 transition-all duration-500"
                style={{ height: `${circlesScore}%` }}
              />
              <div className="relative z-10 bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-orange-600">{circlesScore || 'N/A'}</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800">Circle Score</div>
            <div className="text-xs text-gray-500 mt-1">
              {circleScore?.totalContributors || 0} in your network
            </div>
          </div>
        </div>

        {/* Enhanced Trust Score Section - Detailed view */}
        <TrustScoreSection 
          circleScore={circleScore ?? null}
          isLoading={isCircleScoreLoading}
        />

        {/* Top Mentions - Enhanced with better mobile display */}
        {restaurant.communityInsights?.topDishes && restaurant.communityInsights.topDishes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Popular Dishes
              </h3>
              <div className="flex flex-wrap gap-2">
                {restaurant.communityInsights.topDishes.slice(0, 6).map((dish, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {dish.dish} {dish.mentions > 1 && `(${dish.mentions})`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Your Rating Section - Condensed for mobile */}
        {userRating ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Your Rating</h3>
                <QuickRateButton
                  restaurant={{
                    id: queryMethod === 'id' ? Number(restaurantId) : undefined,
                    googlePlaceId: queryMethod === 'googlePlaceId' ? restaurantId : restaurant.googlePlaceId,
                    name: restaurant.name,
                    location: restaurant.location,
                    address: restaurant.address
                  }}
                  existingRating={userRating}
                  variant="compact"
                />
              </div>
              <RatingDisplay
                rating={userRating}
                restaurant={{
                  name: restaurant.name,
                  location: restaurant.location
                }}
                compact={true}
                showRestaurant={false}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* List Mentions Section */}
        <ListMentionsSection
          lists={mockLists}
          restaurantName={restaurant.name}
          isLoading={false}
        />

        {/* Social Activity Feed */}
        <SocialActivityFeed
          posts={mockPosts}
          restaurantName={restaurant.name}
          isLoading={false}
        />

        {/* Tabbed Navigation - Simplified for mobile */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="menu">Menu & Contact</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Contact & Location</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-gray-600">{restaurant.address || restaurant.location}</p>
                      </div>
                    </div>
                    
                    {restaurant.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <a 
                            href={`tel:${restaurant.phone}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {restaurant.phone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {restaurant.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">Website</p>
                          <a 
                            href={restaurant.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Visit Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}


                  </div>
                </CardContent>
              </Card>

              {/* Restaurant Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Restaurant Details</h3>
                  <div className="space-y-3">
                    {restaurant.hours && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Hours</p>
                          <div className="text-gray-600 space-y-1">
                            {restaurant.hours.split('\n').map((line, index) => (
                              <p key={index} className="text-sm">{line}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Price Range</p>
                        <p className="text-gray-600">{restaurant.priceRange}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">Cuisine</p>
                        <p className="text-gray-600">{restaurant.cuisine}</p>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{restaurant.category}</Badge>
                    </div>
                    
                    {/* Business Status */}
                    {restaurant.googlePlaces?.isOpen !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${restaurant.googlePlaces.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-medium">Status</p>
                          <p className={`text-sm font-medium ${restaurant.googlePlaces.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                            {restaurant.googlePlaces.isOpen ? 'Open Now' : 'Closed'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Rating Summary */}
                    <div className="border-t pt-3 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Ratings Summary</p>
                      </div>
                      <div className="space-y-2">
                        {restaurant.googlePlaces?.rating && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Google Rating</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{restaurant.googlePlaces.rating}</span>
                              <span className="text-xs text-gray-500">({restaurant.googlePlaces.reviewCount} reviews)</span>
                            </div>
                          </div>
                        )}
                        {restaurant.communityInsights?.followersAverageRating && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Community Rating</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-orange-500 fill-current" />
                              <span className="text-sm font-medium">{restaurant.communityInsights.followersAverageRating}</span>
                              <span className="text-xs text-gray-500">({restaurant.communityInsights.followersReviewCount} reviews)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Information Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Reservation Options */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Make a Reservation</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(`https://www.opentable.com/s/?text=${encodeURIComponent(restaurant.name + ' ' + restaurant.location)}`, '_blank')}
                    >
                      OpenTable
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(`https://resy.com/cities/new-york-ny?query=${encodeURIComponent(restaurant.name)}`, '_blank')}
                    >
                      Resy
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Social Actions */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Share & Save</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Restaurant
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Save for Later
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <QuickRateButton
                      restaurant={{
                        id: restaurant.id === "google_" + restaurant.googlePlaceId ? undefined : parseInt(restaurant.id),
                        googlePlaceId: restaurant.googlePlaceId,
                        name: restaurant.name,
                        location: restaurant.location,
                        address: restaurant.address
                      }}
                      className="w-full"
                    />
                    <Button variant="outline" size="sm" className="w-full">
                      Write Review
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Add Photos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <UtensilsCrossed className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Menu</h3>
                </div>
                
                <div className="space-y-4">
                  {restaurant.website && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Restaurant Website</h4>
                      <p className="text-gray-600 text-sm mb-3">View the full menu and current specials on the restaurant's official website.</p>
                      <Button 
                        onClick={() => window.open(restaurant.website, '_blank')}
                        className="flex items-center gap-2 w-full"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Visit {restaurant.name}
                      </Button>
                    </div>
                  )}
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Order Online</h4>
                    <p className="text-gray-600 text-sm mb-3">Find menu and delivery options on popular food delivery platforms.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`https://www.ubereats.com/ca/search?q=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Uber Eats
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`https://www.doordash.com/search/store/${encodeURIComponent(restaurant.name)}`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        DoorDash
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`https://www.grubhub.com/search?searchTerm=${encodeURIComponent(restaurant.name)}`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Grubhub
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Search for Menu</h4>
                    <p className="text-gray-600 text-sm mb-3">Search for user-uploaded menus and reviews on popular platforms.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' menu ' + restaurant.address)}`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Google Search
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`https://www.yelp.com/search?find_desc=${encodeURIComponent(restaurant.name)}&find_loc=${encodeURIComponent(restaurant.address)}`, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Yelp
                      </Button>
                    </div>
                  </div>
                  
                  {!restaurant.website && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No direct menu available online.</p>
                      <p className="text-xs text-gray-400 mt-1">Try calling the restaurant at {restaurant.phone} for menu details.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Mobile Action Bar */}
        <RestaurantActionBar
          restaurant={{
            id: queryMethod === 'id' ? Number(restaurantId) : undefined,
            googlePlaceId: queryMethod === 'googlePlaceId' ? restaurantId : restaurant.googlePlaceId,
            name: restaurant.name,
            location: restaurant.location,
            address: restaurant.address
          }}
          userRating={userRating}
          isSaved={false} // TODO: fetch from API
          variant="mobile"
          className="md:hidden" // Only show on mobile
        />
      </div>
    </div>
  );
}