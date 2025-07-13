import React from 'react';
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
  const [, setLocation] = useLocation();

  const restaurantId = placeId || id;
  const isGooglePlace = !!placeId;

  const { data: restaurant, isLoading, error } = useQuery<RestaurantDetails>({
    queryKey: isGooglePlace ? [`/api/google/places/${restaurantId}`] : [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
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

  // Get restaurant image URL
  const heroImageUrl = restaurant.imageUrl || 
    (restaurant.googlePlaces?.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${restaurant.googlePlaces.photos[0].reference}&key=AIzaSyBxuBRddfzY83RF5FsCk6ON2Mzex8jnKPM` : 
      null);

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Hero Section */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        {heroImageUrl ? (
          <img 
            src={heroImageUrl} 
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <ChefHat className="h-16 w-16 text-gray-600" />
          </div>
        )}
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Restaurant name overlay */}
        <div className="absolute bottom-6 left-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {restaurant.name}
          </h1>
          <div className="flex items-center text-white/90">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{restaurant.location}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Dual Score Display */}
        <div className="flex justify-center gap-8 mb-8">
          <CircularProgress
            percentage={googleScore}
            label="Google Score"
            color="#10B981"
            size={100}
          />
          <CircularProgress
            percentage={circlesScore}
            label="Circles Score"
            color="#F59E0B"
            size={100}
          />
        </div>

        {/* Top Mentions */}
        {restaurant.communityInsights?.topDishes && restaurant.communityInsights.topDishes.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {restaurant.communityInsights.topDishes.slice(0, 3).map((dish, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {dish.dish}
              </Badge>
            ))}
          </div>
        )}

        {/* Tabbed Navigation */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Contact</h3>
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
                          <p className="text-gray-600">{restaurant.phone}</p>
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
                  <h3 className="font-semibold text-lg mb-4">Information</h3>
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
                      <p className="text-gray-500 text-sm">
                        For the most up-to-date menu, we recommend calling the restaurant directly at {restaurant.phone || 'their listed phone number'}.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <div className="grid gap-6">
              {/* Circles Reviews */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Circles Reviews</h3>
                    <Badge variant="outline">
                      {restaurant.communityInsights?.followersReviewCount || 0} reviews
                    </Badge>
                  </div>
                  {restaurant.communityInsights?.recentPosts && restaurant.communityInsights.recentPosts.length > 0 ? (
                    <div className="space-y-4">
                      {restaurant.communityInsights.recentPosts.slice(0, 3).map((post) => (
                        <div key={post.id} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{post.author.name}</span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${
                                      i < post.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{post.content}</p>
                          {post.dishesTried && post.dishesTried.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.dishesTried.map((dish, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {dish}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No reviews from your circles yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Google Reviews */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Google Reviews</h3>
                    <Badge variant="outline">
                      {restaurant.googlePlaces?.reviewCount || 0} reviews
                    </Badge>
                  </div>
                  {restaurant.googlePlaces?.reviews && restaurant.googlePlaces.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {restaurant.googlePlaces.reviews.slice(0, 3).map((review, index) => (
                        <div key={index} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.authorName}</span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${
                                      i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                    }`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.time * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{review.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No Google reviews available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Bar - Sticky on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:relative md:bg-transparent md:border-t-0 md:shadow-none md:p-0 md:mt-8">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button className="flex-1 md:flex-none" size="lg">
            <Share2 className="h-4 w-4 mr-2" />
            Share Experience
          </Button>
          <Button variant="outline" className="flex-1 md:flex-none" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add to List
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 md:flex-none" 
            size="lg"
            onClick={() => {
              if (restaurant.googlePlaceId) {
                window.open(`https://www.google.com/maps/place/?q=place_id:${restaurant.googlePlaceId}`, '_blank');
              } else if (restaurant.address) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`, '_blank');
              }
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            View on Maps
          </Button>
        </div>
      </div>

      {/* Add bottom padding on mobile to account for sticky action bar */}
      <div className="h-20 md:h-0" />
    </div>
  );
}