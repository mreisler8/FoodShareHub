import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Star, Phone, Globe, Clock, DollarSign, UtensilsCrossed, Users, Heart, MessageSquare, ChefHat, Utensils } from 'lucide-react';

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

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: restaurant, isLoading, error } = useQuery<RestaurantDetails>({
    queryKey: ['/api/restaurants', id],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant details');
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Restaurant Not Found</h2>
                <p className="text-muted-foreground">
                  The restaurant you're looking for doesn't exist or has been removed.
                </p>
                <Button
                  onClick={() => setLocation('/')}
                  className="mt-4"
                >
                  Back to Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>

        {/* Restaurant Hero */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Restaurant Image */}
            <div className="md:w-1/3">
              {restaurant.imageUrl ? (
                <img
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Restaurant Info */}
            <div className="md:w-2/3">
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
                  <div className="flex items-center gap-4 flex-wrap">
                    {restaurant.googlePlaces && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{restaurant.googlePlaces.rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({restaurant.googlePlaces.reviewCount} reviews)
                        </span>
                      </div>
                    )}
                    {restaurant.communityInsights.hasFollowersReviewed && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-blue-600">
                          {restaurant.communityInsights.followersAverageRating?.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({restaurant.communityInsights.followersReviewCount} from your network)
                        </span>
                      </div>
                    )}
                    <Badge variant="secondary">{restaurant.category}</Badge>
                    <Badge variant="outline">{restaurant.priceRange}</Badge>
                    {restaurant.googlePlaces?.isOpen !== undefined && (
                      <Badge variant={restaurant.googlePlaces.isOpen ? "default" : "secondary"}>
                        {restaurant.googlePlaces.isOpen ? "Open Now" : "Closed"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{restaurant.location}</span>
                  </div>
                  {restaurant.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm text-muted-foreground">{restaurant.address}</span>
                    </div>
                  )}
                  {restaurant.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{restaurant.phone}</span>
                    </div>
                  )}
                  {restaurant.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                {restaurant.description && (
                  <div>
                    <p className="text-muted-foreground">{restaurant.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Community Insights */}
        {restaurant.communityInsights.hasFollowersReviewed && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              What Your Network Says
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Dishes */}
              {restaurant.communityInsights.topDishes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      Top Dishes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {restaurant.communityInsights.topDishes.map((dish, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="font-medium">{dish.dish}</span>
                          <Badge variant="secondary">
                            {dish.mentions} mention{dish.mentions > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Posts from Network */}
              {restaurant.communityInsights.recentPosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Recent Reviews from Your Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {restaurant.communityInsights.recentPosts.slice(0, 2).map((post) => (
                        <div key={post.id} className="border-l-4 border-blue-500 pl-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{post.rating}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              by {post.author.name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.content}
                          </p>
                          {post.dishesTried && post.dishesTried.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.dishesTried.slice(0, 3).map((dish, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {dish}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Cuisine & Price */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Cuisine & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuisine Type</span>
                  <span className="font-medium">{restaurant.cuisine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price Range</span>
                  <span className="font-medium">{restaurant.priceRange}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{restaurant.category}</span>
                </div>
                {restaurant.googlePlaces?.businessStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{restaurant.googlePlaces.businessStatus}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hours */}
          {restaurant.hours && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {restaurant.hours.split('\n').map((hour, index) => (
                    <div key={index} className="text-sm">
                      {hour}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Google Reviews */}
        {restaurant.googlePlaces?.reviews && restaurant.googlePlaces.reviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              Google Reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {restaurant.googlePlaces.reviews.slice(0, 4).map((review, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{review.rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {review.authorName}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {review.text}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(review.time * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Fallback for users with no network */}
        {!restaurant.communityInsights.hasFollowersReviewed && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Network Reviews Yet</h3>
                  <p className="text-muted-foreground">
                    Follow friends to see their reviews and recommendations for this restaurant.
                  </p>
                </div>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap">
          <Button size="lg" className="flex-1 max-w-sm">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            Share Experience
          </Button>
          <Button variant="outline" size="lg" className="flex-1 max-w-sm">
            Add to List
          </Button>
          {restaurant.googlePlaceId && (
            <Button variant="outline" size="lg">
              <MapPin className="h-4 w-4 mr-2" />
              View on Maps
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}