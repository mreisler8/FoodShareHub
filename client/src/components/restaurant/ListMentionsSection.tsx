import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Scroll, Star, Crown, Medal, Award, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface RestaurantList {
  id: number;
  name: string;
  description?: string;
  owner: {
    id: number;
    name: string;
    username: string;
  };
  itemCount: number;
  isPublic: boolean;
  ranking?: number; // Position in the list (1-based)
  tags: string[];
  createdAt: string;
}

interface ListMentionsSectionProps {
  lists: RestaurantList[];
  restaurantName: string;
  isLoading?: boolean;
  className?: string;
}

export default function ListMentionsSection({ 
  lists, 
  restaurantName,
  isLoading = false, 
  className 
}: ListMentionsSectionProps) {
  const getRankingBadge = (ranking: number) => {
    if (ranking === 1) {
      return (
        <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-white px-2 py-1 text-xs flex items-center gap-1">
          <Crown className="h-3 w-3" />
          #{ranking}
        </Badge>
      );
    }
    if (ranking === 2) {
      return (
        <Badge className="absolute -top-2 -right-2 bg-gray-400 text-white px-2 py-1 text-xs flex items-center gap-1">
          <Medal className="h-3 w-3" />
          #{ranking}
        </Badge>
      );
    }
    if (ranking === 3) {
      return (
        <Badge className="absolute -top-2 -right-2 bg-amber-600 text-white px-2 py-1 text-xs flex items-center gap-1">
          <Award className="h-3 w-3" />
          #{ranking}
        </Badge>
      );
    }
    // Only show ranking for top 3 positions as per brief
    return null;
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lists || lists.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Scroll className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Lists</h3>
            </div>
            
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Scroll className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                {restaurantName} isn't on any lists yet — add it to yours!
              </p>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add to List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedLists = [...lists].sort((a, b) => {
    // Prioritize lists with top 3 rankings
    const aHasTopRanking = a.ranking && a.ranking <= 3;
    const bHasTopRanking = b.ranking && b.ranking <= 3;
    
    if (aHasTopRanking && !bHasTopRanking) return -1;
    if (!aHasTopRanking && bHasTopRanking) return 1;
    if (aHasTopRanking && bHasTopRanking) {
      return a.ranking! - b.ranking!;
    }
    
    // Then sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const displayLists = sortedLists.slice(0, 6); // Show up to 6 lists

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                Appears in {lists.length} List{lists.length !== 1 ? 's' : ''}
              </h3>
            </div>
            
            {lists.length > 6 && (
              <Button variant="ghost" size="sm">
                View All ({lists.length})
              </Button>
            )}
          </div>

          {/* Lists Grid - Horizontal scroll on mobile, grid on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayLists.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`}>
                <div className="relative group cursor-pointer">
                  <div className="border rounded-lg p-4 hover:shadow-md transition-all hover:border-gray-300">
                    {/* Smart ranking display - only for top 3 */}
                    {list.ranking && list.ranking <= 3 && getRankingBadge(list.ranking)}
                    
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-sm">
                          {list.owner.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">
                          {list.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          by {list.owner.name} · {list.itemCount} places
                        </p>
                        
                        {list.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {list.description}
                          </p>
                        )}
                        
                        {/* Tags */}
                        {list.tags && list.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {list.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {list.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{list.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Show ranking for positions 4+ in a subtle way */}
                        {list.ranking && list.ranking > 3 && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">
                              #{list.ranking} on this list
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Show more indicator for mobile horizontal scroll */}
          <div className="md:hidden">
            {lists.length > 3 && (
              <div className="text-center">
                <Button variant="ghost" size="sm" className="text-xs">
                  Swipe to see {lists.length - 3} more lists →
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}