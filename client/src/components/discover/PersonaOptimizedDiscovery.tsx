
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Clock, Users, Camera, Share } from 'lucide-react';
import { AdvancedSearchFilters, SearchFilters } from '../search/AdvancedSearchFilters';
import { TagBasedListFiltering } from '../lists/TagBasedListFiltering';

interface PersonaOptimizedDiscoveryProps {
  userType?: 'explorer' | 'seeker' | 'influencer' | 'tracker';
  restaurants: any[];
  lists: any[];
  posts: any[];
}

export function PersonaOptimizedDiscovery({ 
  userType = 'explorer', 
  restaurants, 
  lists, 
  posts 
}: PersonaOptimizedDiscoveryProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filteredLists, setFilteredLists] = useState(lists);

  // Explorer Alex: Cuisine/Location filtering
  const explorerContent = (
    <div className="space-y-6">
      <AdvancedSearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClear={() => setFilters({})}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map(restaurant => (
          <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{restaurant.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {restaurant.location}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{restaurant.cuisine}</Badge>
                  <Badge variant="outline">{restaurant.priceRange}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{restaurant.avgRating?.toFixed(1) || '4.0'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Seeker Sam: Occasion-based discovery
  const seekerContent = (
    <div className="space-y-6">
      <TagBasedListFiltering
        lists={lists}
        onFilteredListsChange={setFilteredLists}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLists.map(list => (
          <Card key={list.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold">{list.name}</h3>
                <p className="text-sm text-gray-600">{list.description}</p>
                <div className="flex flex-wrap gap-1">
                  {list.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{list.restaurantCount || 0} restaurants</span>
                  <span>{list.saveCount || 0} saves</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Influencer Riley: Content creation focused
  const influencerContent = (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Share Your Latest Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full mb-4">
            <Camera className="h-4 w-4 mr-2" />
            Create New Post
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map(post => (
          <Card key={post.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">{post.authorName}</p>
                    <p className="text-xs text-gray-500">{post.createdAt}</p>
                  </div>
                </div>
                <p className="text-sm">{post.content}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{post.restaurantName}</Badge>
                  {post.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs">{post.rating}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <button className="flex items-center gap-1 hover:text-gray-700">
                    <Share className="h-3 w-3" />
                    Share
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <Tabs defaultValue={userType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="seeker">Occasion Search</TabsTrigger>
          <TabsTrigger value="influencer">Content Hub</TabsTrigger>
        </TabsList>
        
        <TabsContent value="explorer" className="mt-6">
          {explorerContent}
        </TabsContent>
        
        <TabsContent value="seeker" className="mt-6">
          {seekerContent}
        </TabsContent>
        
        <TabsContent value="influencer" className="mt-6">
          {influencerContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
