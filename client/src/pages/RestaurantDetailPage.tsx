import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Star, Phone, Globe, Clock, DollarSign, UtensilsCrossed } from 'lucide-react';

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
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-muted rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
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
                    {restaurant.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{restaurant.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <Badge variant="secondary">{restaurant.category}</Badge>
                    <Badge variant="outline">{restaurant.priceRange}</Badge>
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