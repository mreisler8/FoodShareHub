import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  Star, 
  Calendar, 
  MapPin, 
  Activity,
  ArrowRight,
  Users
} from 'lucide-react';
import { PopularRestaurant } from '@/lib/types';

// Mock data for restaurants open tonight
const mockTonightRestaurants: PopularRestaurant[] = [
  {
    id: 1,
    name: 'Pasta Paradise',
    category: 'Italian',
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 128
  },
  {
    id: 2,
    name: 'Sushi Supreme',
    category: 'Japanese',
    priceRange: '$$$',
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviewCount: 87
  },
  {
    id: 3,
    name: 'Taco Town',
    category: 'Mexican',
    priceRange: '$',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.5,
    reviewCount: 92
  }
];

// Mock data for trending restaurants
const mockTrendingRestaurants: PopularRestaurant[] = [
  {
    id: 4,
    name: 'Burger Bistro',
    category: 'American',
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.6,
    reviewCount: 114
  },
  {
    id: 5,
    name: 'Curry Corner',
    category: 'Indian',
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviewCount: 76
  },
  {
    id: 6,
    name: 'Pho Palace',
    category: 'Vietnamese',
    priceRange: '$',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.4,
    reviewCount: 68
  }
];

// Mock data for friend-recommended restaurants
const mockFriendRecommendedRestaurants: PopularRestaurant[] = [
  {
    id: 7,
    name: 'Dim Sum Delight',
    category: 'Chinese',
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.5,
    reviewCount: 95
  },
  {
    id: 8,
    name: 'Pizza Palace',
    category: 'Italian',
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviewCount: 103
  },
  {
    id: 9,
    name: 'Ramen Republic',
    category: 'Japanese',
    priceRange: '$$',
    image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    rating: 4.6,
    reviewCount: 82
  }
];

export function TonightSection() {
  // In a real implementation, these would fetch from the API
  const { data: tonightRestaurants, isLoading: isLoadingTonight } = useQuery({
    queryKey: ['/api/restaurants/tonight'],
    enabled: false // Disabled since we're using mock data
  });

  const { data: trendingRestaurants, isLoading: isLoadingTrending } = useQuery({
    queryKey: ['/api/restaurants/trending'],
    enabled: false // Disabled since we're using mock data
  });

  const { data: friendRecommendedRestaurants, isLoading: isLoadingFriendRecommended } = useQuery({
    queryKey: ['/api/restaurants/friend-recommended'],
    enabled: false // Disabled since we're using mock data
  });

  // For now, we'll use the mock data
  const restaurants = {
    tonight: mockTonightRestaurants,
    trending: mockTrendingRestaurants,
    friendRecommended: mockFriendRecommendedRestaurants
  };

  const isLoading = isLoadingTonight || isLoadingTrending || isLoadingFriendRecommended;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Tonight's Picks</CardTitle>
            <CardDescription>Quick recommendations for your evening plans</CardDescription>
          </div>
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tonight" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tonight">
              <Clock className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Open Tonight</span>
              <span className="sm:hidden">Tonight</span>
            </TabsTrigger>
            <TabsTrigger value="trending">
              <Activity className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Trending</span>
              <span className="sm:hidden">Hot</span>
            </TabsTrigger>
            <TabsTrigger value="friendRecommended">
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Friend Picks</span>
              <span className="sm:hidden">Friends</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tonight" className="pt-4">
            {isLoading ? (
              <RestaurantSkeleton />
            ) : (
              <RestaurantList restaurants={restaurants.tonight} />
            )}
          </TabsContent>
          
          <TabsContent value="trending" className="pt-4">
            {isLoading ? (
              <RestaurantSkeleton />
            ) : (
              <RestaurantList restaurants={restaurants.trending} />
            )}
          </TabsContent>
          
          <TabsContent value="friendRecommended" className="pt-4">
            {isLoading ? (
              <RestaurantSkeleton />
            ) : (
              <RestaurantList restaurants={restaurants.friendRecommended} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/discover">
          <Button variant="ghost" className="gap-1">
            See more recommendations
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function RestaurantList({ restaurants }: { restaurants: PopularRestaurant[] }) {
  return (
    <div className="space-y-4">
      {restaurants.map((restaurant) => (
        <Link key={restaurant.id} href={`/restaurants/${restaurant.id}`}>
          <a className="block">
            <div className="flex rounded-lg overflow-hidden border border-border hover:border-primary transition-colors">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-muted">
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-3">
                <h3 className="font-medium text-foreground">{restaurant.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm">{restaurant.rating}</span>
                  <span className="text-xs text-muted-foreground">({restaurant.reviewCount})</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span>{restaurant.category}</span>
                  <span className="mx-1">•</span>
                  <span>{restaurant.priceRange}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    <Clock className="h-3 w-3" />
                    <span>Open Now</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
                    <MapPin className="h-3 w-3" />
                    <span>1.2 mi</span>
                  </span>
                </div>
              </div>
            </div>
          </a>
        </Link>
      ))}
    </div>
  );
}

function RestaurantSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex rounded-lg overflow-hidden border border-border">
          <Skeleton className="w-24 h-24 sm:w-32 sm:h-32" />
          <div className="flex-1 p-3">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/4 mb-2" />
            <Skeleton className="h-3 w-2/4 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}