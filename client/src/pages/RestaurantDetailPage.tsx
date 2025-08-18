import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
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
import { NotFound } from '@/components/ui/NotFound';
import { InlineError } from '@/components/common/InlineError';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { getErrorMessage, isValidId } from '@/lib/error-utils';


import { useStandardizedRestaurantQueries } from '@/hooks/useStandardizedRestaurantQueries';
import { DebugOrigin, RestaurantDebugPanel } from '@/components/debug/RestaurantDebugPanel';

// New modular components for the redesign
import { HeaderCard } from '@/components/restaurant/HeaderCard';
import { CircleScoreCard } from '@/components/restaurant/CircleScoreCard';
import { CircleScoreEnhancement } from '@/components/mvp/CircleScoreEnhancement';
import { MobileResponsiveLayout } from '@/components/mvp/MobileResponsiveLayout';
import { YourRatingCard } from '@/components/restaurant/YourRatingCard';
import { ListMentionsCard } from '@/components/restaurant/ListMentionsCard';
import { PostMentionsCard } from '@/components/restaurant/PostMentionsCard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import RestaurantActionBar from '@/components/restaurant/RestaurantActionBar';
import ReservationCard from '@/components/restaurant/ReservationCard';
import MoreRestaurantActions from '@/components/restaurant/MoreRestaurantActions';
import OrderOptionsCard from '@/components/restaurant/OrderOptionsCard';


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
      photo_reference: string;
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
  const queryClient = useQueryClient();

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

  const { data: restaurant, isLoading, error, refetch } = useQuery<RestaurantDetails>({
    queryKey: queryMethod === 'googlePlaceId' ? [`/api/restaurants?googlePlaceId=${restaurantId}`] : [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
    retry: (failureCount, error: any) => {
      // Don't retry 404s (restaurant not found)
      if (error?.response?.status === 404) return false;
      // Don't retry invalid parameter errors
      if (error?.message?.includes('Invalid')) return false;
      // Retry up to 2 times for Google Places API failures
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Failed to fetch restaurant details (${response.status})`;
          
          // Handle specific error types
          if (response.status === 404) {
            throw new Error('Restaurant not found');
          } else if (response.status >= 500) {
            throw new Error('Server error - please try again later');
          } else if (response.status === 400) {
            throw new Error('Invalid restaurant ID');
          }
          
          throw new Error(errorMessage);
        }
        return response.json();
      } catch (networkError) {
        // Handle network errors gracefully
        if (networkError instanceof TypeError && networkError.message === 'Failed to fetch') {
          throw new Error('Network error - please check your connection and try again');
        }
        throw networkError;
      }
    },
  });

  // CRITICAL: Use standardized queries for consistent cache keys and data integrity
  const { 
    userRating, 
    circleScore, 
    isLoading: isRatingLoading,
    submitRating,
    data: { userRating: userRatingData, circleScore: circleScoreData }
  } = useStandardizedRestaurantQueries(restaurant ? {
    id: typeof restaurant.id === 'string' ? parseInt(restaurant.id) : restaurant.id,
    googlePlaceId: restaurant.googlePlaceId,
    name: restaurant.name
  } : { 
    id: queryMethod === 'id' ? parseInt(restaurantId!) : undefined,
    googlePlaceId: queryMethod === 'googlePlaceId' ? restaurantId : undefined,
    name: 'Loading...'
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <InlineError 
          message={getErrorMessage(error)} 
          onRetry={() => refetch()}
        />
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

  // Get optimized restaurant image URL with proper fallbacks
  const getHeroImageData = () => {
    console.log('🖼️ Getting hero image for:', restaurant.name);
    console.log('🖼️ Restaurant imageUrl:', restaurant.imageUrl);
    console.log('🖼️ Google Places photos:', restaurant.googlePlaces?.photos?.length || 0);

    // Priority 1: Backend-provided image URL (includes Google Places photos with API key)
    if (restaurant.imageUrl && restaurant.imageUrl.startsWith('http')) {
      console.log('✅ Using backend imageUrl:', restaurant.imageUrl);
      return { 
        src: restaurant.imageUrl,
        aspectRatio: 16/9
      };
    }

    // Priority 2: Fallback to beautiful food images
    const sampleFoodImages = [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&q=80', // Pizza
      'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800&q=80', // Restaurant interior
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80', // Italian food
    ];

    const imageIndex = restaurant.name.length % sampleFoodImages.length;
    console.log('🎨 Using fallback image:', sampleFoodImages[imageIndex]);

    return {
      src: sampleFoodImages[imageIndex],
      aspectRatio: 16/9
    };
  };

  const heroImageData = getHeroImageData();

  // Real API data for lists and posts
  const { data: restaurantLists, isLoading: isListsLoading } = useQuery({
    queryKey: ['restaurantLists', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await fetch(`/api/restaurants/${restaurantId}/lists`);
      if (!response.ok) return [];
      const data = await response.json();
      
      // Transform API response to match ListMentionsCard interface  
      return data.map((list: any) => ({
        id: list.id,
        name: list.name,
        description: list.description,
        owner: list.owner,
        itemCount: list.itemCount || 0,
        isPublic: list.isPublic || false,
        ranking: list.ranking,
        tags: list.tags || [],
        createdAt: list.createdAt
      }));
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minute
  });

  const { data: restaurantPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['restaurantPosts', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await fetch(`/api/restaurants/${restaurantId}/posts`);
      if (!response.ok) return [];
      const data = await response.json();
      
      // Transform API response to match PostMentionsCard interface
      return data.map((post: any) => ({
        id: post.id,
        content: post.content,
        rating: post.rating,
        images: post.images || [],
        author: {
          id: post.author.id,
          name: post.author.name,
          username: post.author.username,
          profileImage: undefined // Will be fetched separately if needed
        },
        createdAt: post.createdAt,
        likes: post.likeCount || 0,
        comments: post.commentCount || 0,
        dishName: post.dishesTried?.[0] // Use first dish as primary dish
      }));
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minute
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Debug Panel - Only visible with ?debug=true */}
      <RestaurantDebugPanel 
        restaurantId={restaurant.id ? parseInt(restaurant.id.toString()) : undefined}
        placeId={restaurant.googlePlaceId}
      />
      
      {/* Hero Section with enhanced mobile-first design */}
      <div className="relative h-48 md:h-64 w-full overflow-hidden">
        {heroImageData && heroImageData.src ? (
          <>
            <img 
              src={heroImageData.src}
              alt={restaurant.name}
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                console.log('Image failed to load:', heroImageData.src);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Show fallback
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', heroImageData.src);
              }}
            />
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center hidden">
              <ChefHat className="h-12 w-12 md:h-16 md:w-16 text-gray-600" />
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <ChefHat className="h-12 w-12 md:h-16 md:w-16 text-gray-600" />
          </div>
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Restaurant info overlay - mobile optimized */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {restaurant.name}
          </h1>
          <p className="text-sm text-white/90">
            {restaurant.cuisine} · {restaurant.location} · {restaurant.priceRange}
          </p>
        </div>
      </div>

      {/* Main Content - Mobile-first modular layout */}
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        {/* Header Section with Contact Details */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {restaurant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <UtensilsCrossed className="h-4 w-4" />
                <span>{restaurant.cuisine}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{restaurant.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{restaurant.priceRange}</span>
              </div>
            </div>
            
            {/* Key Contact Info */}
            <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
              {restaurant.address && restaurant.address !== restaurant.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Address</p>
                    <p className="text-xs text-gray-600">{restaurant.address}</p>
                  </div>
                </div>
              )}

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

              

              {/* Business Status */}
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

        {/* Dual Score Display - Google vs Circle Score (Rotten Tomatoes Style) */}
        <DebugOrigin 
          label="Circle Score Tile"
          endpoint="/api/restaurant/:id/circle-score"
          queryKey={['circleScore', restaurant?.id]}
          restaurantId={typeof restaurant?.id === 'string' ? parseInt(restaurant.id) : restaurant?.id}
          placeId={restaurant?.googlePlaceId}
        >
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
                <span className="text-xl font-bold text-orange-600">{circleScoreData?.score || '—'}</span>
              </div>
            </div>
            <div className="text-sm font-bold text-gray-800">Circle Score</div>
            <div className="text-xs text-gray-500 mt-1">
              {circleScoreData?.ratingsCount || 0} in your network
            </div>
          </div>
          </div>
        </DebugOrigin>

        {/* Circle Score Section - MVP Enhanced with Consistent Display */}
        <ErrorBoundary>
          <CircleScoreEnhancement
            restaurantId={queryMethod === 'id' ? Number(restaurantId) : undefined}
            googlePlaceId={queryMethod === 'googlePlaceId' ? restaurantId : restaurant.googlePlaceId}
            variant="detailed"
          />
        </ErrorBoundary>

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

        {/* Top Horizontal Action Bar */}
        <RestaurantActionBar
          restaurant={{
            id: queryMethod === 'id' ? Number(restaurantId) : undefined,
            googlePlaceId: queryMethod === 'googlePlaceId' ? restaurantId : restaurant.googlePlaceId,
            name: restaurant.name,
            location: restaurant.location,
            address: restaurant.address
          }}
          isSaved={false} // TODO: fetch from API
          variant="desktop"
        />

        {/* Sidebar Cards Section - 3 Column Grid as per Development Brief */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Make a Reservation */}
          <SectionBoundary 
            title="Reservation"
            fallback={<SkeletonCard lines={1} showActions={true} />}
          >
            <ReservationCard 
              restaurant={{
                name: restaurant.name,
                location: restaurant.location
              }}
            />
          </SectionBoundary>

          {/* View Menu & Order */}
          <SectionBoundary 
            title="Menu & Order"
            fallback={<SkeletonCard lines={1} showActions={true} />}
          >
            <OrderOptionsCard 
              restaurant={{
                name: restaurant.name,
                location: restaurant.location,
                website: restaurant.website
              }}
              menuUrl={restaurant.website}
              orderUrl={undefined}
            />
          </SectionBoundary>

          {/* More Restaurant Actions */}
          <SectionBoundary 
            title="More Actions"
            fallback={<SkeletonCard lines={1} showActions={true} />}
          >
            <MoreRestaurantActions 
              restaurant={{
                name: restaurant.name,
                location: restaurant.location
              }}
            />
          </SectionBoundary>
        </div>

        {/* Your Activity Section with Error Boundary */}
        <ErrorBoundary fallback={
          <div className="rounded-xl shadow-sm bg-white p-4">
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Unable to load your rating</p>
            </div>
          </div>
        }>
          <DebugOrigin
            label="Your Rating Block"
            endpoint="/api/ratings/restaurant/:id"
            queryKey={['userRating', restaurant?.id]}
            restaurantId={typeof restaurant?.id === 'string' ? parseInt(restaurant.id) : restaurant?.id}
            placeId={restaurant?.googlePlaceId}
          >
            <YourRatingCard 
              userRating={userRatingData ? {
                rating: parseFloat(userRatingData.ratingValue.toString()) || 0,
                note: userRatingData.note,
                tags: userRatingData.tags
              } : undefined}
              onRate={(rating, note, tags) => {
                console.log('Rating updated:', { rating, note, tags });
                submitRating.mutate({
                  ratingValue: rating,
                  note,
                  tags,
                  isPrivate: false
                }, {
                  onSuccess: () => {
                    console.log('Rating submitted successfully, invalidating related caches');
                    // Additional cache invalidation for any restaurant-related data
                    queryClient.invalidateQueries({ queryKey: ['restaurantPosts', restaurantId] });
                    queryClient.invalidateQueries({ queryKey: ['restaurantLists', restaurantId] });
                  }
                });
              }}
            />
          </DebugOrigin>
        </ErrorBoundary>

        {/* Lists Mentioned In Section - Real API Data with Error Boundary */}
        <ErrorBoundary fallback={
          <div className="rounded-xl shadow-sm bg-white p-4">
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Unable to load list mentions</p>
            </div>
          </div>
        }>
          {isListsLoading ? (
            <div className="rounded-xl shadow-sm bg-white p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <ListMentionsCard 
              lists={restaurantLists || []}
              onViewList={(listId) => {
                console.log('View list:', listId);
                // TODO: Navigate to list detail
              }}
            />
          )}
        </ErrorBoundary>

        {/* Post Mentions Section - Real API Data with Error Boundary */}
        <ErrorBoundary fallback={
          <div className="rounded-xl shadow-sm bg-white p-4">
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Unable to load recent posts</p>
            </div>
          </div>
        }>
          {isPostsLoading ? (
            <div className="rounded-xl shadow-sm bg-white p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <PostMentionsCard 
              posts={restaurantPosts || []}
              onViewPost={(postId) => {
                console.log('View post:', postId);
                // TODO: Navigate to post detail
              }}
              onViewProfile={(userId) => {
                console.log('View profile:', userId);
                // TODO: Navigate to user profile
              }}
            />
          )}
        </ErrorBoundary>

        
      </div>

      {/* Mobile Action Bar - Fixed at bottom */}
      <div className="md:hidden">
        <RestaurantActionBar
          restaurant={{
            id: queryMethod === 'id' ? Number(restaurantId) : undefined,
            googlePlaceId: queryMethod === 'googlePlaceId' ? restaurantId : restaurant.googlePlaceId,
            name: restaurant.name,
            location: restaurant.location,
            address: restaurant.address
          }}
          isSaved={false} // TODO: fetch from API
          variant="mobile"
        />

        {/* Debug Panel - only visible with ?debug=1 */}
        <RestaurantDebugPanel 
          restaurantId={typeof restaurant?.id === 'string' ? parseInt(restaurant.id) : restaurant?.id}
          placeId={restaurant?.googlePlaceId}
        />
      </div>
    </div>
  );
}