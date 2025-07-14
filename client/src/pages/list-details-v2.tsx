
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ListDetails } from "@/components/lists/ListDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, MoreVertical } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ListDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useCurrentUser();

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["list", id],
    queryFn: async () => {
      const response = await fetch(`/api/lists/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch list');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    if (navigator.share && list) {
      try {
        await navigator.share({
          title: list.name,
          text: `Check out this ${list.type} list: ${list.name}`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-10" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-48 w-full rounded-lg" />
            
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">List Not Found</h1>
          <p className="text-gray-600 mb-4">
            The list you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/lists">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Transform the data to match the ListDetails component interface
  const transformedList = {
    id: list.id.toString(),
    title: list.name,
    creator: list.creator?.name || list.creator?.username || 'Unknown',
    cuisine: list.primaryCuisine,
    city: list.primaryLocation,
    cover_image: list.coverImage,
    audience: list.audience || 'profile',
    description: list.description,
    type: list.type,
    viewCount: list.viewCount,
    saveCount: list.saveCount,
    createdAt: list.createdAt,
    items: list.items?.map((item: any) => ({
      name: item.name,
      notes: item.notes,
      tags: item.tags || [],
      city: item.city,
      mediaUrl: item.mediaUrl,
      rank: item.rank,
      rating: item.rating,
      priceAssessment: item.priceAssessment,
      liked: item.liked,
      disliked: item.disliked,
      mustTryDishes: item.mustTryDishes || [],
    })) || [],
  };

  const isOwner = user?.id === list.createdById;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/lists">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      Edit List
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      Delete List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <ListDetails 
          list={transformedList} 
          userId={user?.id?.toString() || ""} 
        />
      </div>
    </div>
  );
}
