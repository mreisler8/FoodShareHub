import { Tag, TrendingUp, MapPin, Star } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface PopularTag {
  id: string;
  name: string;
  count: number;
  trending: boolean;
  category: 'cuisine' | 'location' | 'type' | 'rating';
}

export function TagExploreCard() {
  // For now, we'll use mock data - in production this would be real trending tags
  const { data: popularTags, isLoading } = useQuery({
    queryKey: ['/api/tags/popular'],
    queryFn: async () => {
      // Mock data for popular tags
      return [
        { id: 'pizza', name: 'Pizza', count: 234, trending: true, category: 'cuisine' as const },
        { id: 'toronto', name: 'Toronto', count: 189, trending: false, category: 'location' as const },
        { id: 'brunch', name: 'Brunch', count: 156, trending: true, category: 'type' as const },
        { id: 'michelin', name: 'Michelin', count: 98, trending: false, category: 'rating' as const },
        { id: 'late-night', name: 'Late Night', count: 87, trending: true, category: 'type' as const },
        { id: 'sushi', name: 'Sushi', count: 143, trending: false, category: 'cuisine' as const },
        { id: 'date-night', name: 'Date Night', count: 76, trending: false, category: 'type' as const },
        { id: 'nyc', name: 'NYC', count: 312, trending: true, category: 'location' as const },
      ] as PopularTag[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const getCategoryIcon = (category: PopularTag['category']) => {
    switch (category) {
      case 'cuisine':
        return <Tag className="h-3 w-3" />;
      case 'location':
        return <MapPin className="h-3 w-3" />;
      case 'type':
        return <Tag className="h-3 w-3" />;
      case 'rating':
        return <Star className="h-3 w-3" />;
      default:
        return <Tag className="h-3 w-3" />;
    }
  };

  const getCategoryColor = (category: PopularTag['category']) => {
    switch (category) {
      case 'cuisine':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'location':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'type':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rating':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-neutral-200">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4"></div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-6 bg-neutral-200 rounded-full w-16"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const tags = popularTags || [];

  if (tags.length === 0) {
    return (
      <Card className="bg-white border border-neutral-200">
        <div className="p-4 pb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Popular Tags
          </h3>
        </div>
        <div className="px-4 pb-4">
          <p className="text-sm text-neutral-500 text-center py-4">
            No trending tags right now
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-neutral-200 hover:border-neutral-300 transition-colors">
      <div className="p-4 pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Popular Tags
        </h3>
      </div>
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.slice(0, 8).map((tag) => (
            <Link key={tag.id} href={`/discover/tags/${tag.id}`}>
              <Badge 
                variant="outline" 
                className={`cursor-pointer hover:shadow-sm transition-all ${getCategoryColor(tag.category)}`}
              >
                <div className="flex items-center gap-1">
                  {getCategoryIcon(tag.category)}
                  <span className="text-xs font-medium">{tag.name}</span>
                  {tag.trending && (
                    <TrendingUp className="h-3 w-3 ml-1" />
                  )}
                </div>
              </Badge>
            </Link>
          ))}
        </div>

        {/* Trending Tags Section */}
        {tags.some(tag => tag.trending) && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Trending Now
            </h4>
            <div className="flex flex-wrap gap-2">
              {tags.filter(tag => tag.trending).slice(0, 4).map((tag) => (
                <Link key={tag.id} href={`/discover/tags/${tag.id}`}>
                  <Badge 
                    variant="default" 
                    className="cursor-pointer hover:shadow-sm transition-all bg-primary/10 text-primary border-primary/20"
                  >
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(tag.category)}
                      <span className="text-xs font-medium">{tag.name}</span>
                      <span className="text-xs opacity-70">({tag.count})</span>
                    </div>
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100">
          <Link href="/discover/tags">
            <Button variant="outline" size="sm" className="w-full">
              Explore All Tags
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}