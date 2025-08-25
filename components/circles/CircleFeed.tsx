
import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantListCard } from "@/components/lists/RestaurantListCard";
import { PermissionGuard } from "./PermissionGuard";
import { Users, Globe, Lock, Share2, AlertCircle, RefreshCw } from "lucide-react";

interface Circle {
  id: number;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  creatorId: number;
  creator?: {
    id: number;
    username: string;
    name: string;
  };
  tags?: string[];
  primaryCuisine?: string;
  location?: string;
}

interface CircleFeedItem {
  id: number;
  name: string;
  description?: string;
  type: "restaurant" | "dish";
  createdById: number;
  creator: {
    id: number;
    username: string;
    name: string;
    profilePicture?: string;
  };
  visibility: string;
  tags?: string[];
  restaurantCount: number;
  coverImage?: string;
  createdAt: string;
  sharedAt?: string;
  sharedBy?: {
    id: number;
    username: string;
    name: string;
  };
}

function CircleMetadata({ circle }: { circle: Circle }) {
  const privacyIcon = circle.isPrivate ? Lock : Globe;
  const PrivacyIcon = privacyIcon;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{circle.name}</h1>
              <Badge variant={circle.isPrivate ? "secondary" : "outline"} className="text-xs">
                <PrivacyIcon className="h-3 w-3 mr-1" />
                {circle.isPrivate ? "Private" : "Public"}
              </Badge>
            </div>
            
            {circle.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {circle.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {circle.memberCount} member{circle.memberCount !== 1 ? 's' : ''}
              </div>
              
              {circle.creator && (
                <div>
                  Created by <span className="font-medium">@{circle.creator.username}</span>
                </div>
              )}

              {circle.location && (
                <div>📍 {circle.location}</div>
              )}

              {circle.primaryCuisine && (
                <Badge variant="outline" className="text-xs">
                  {circle.primaryCuisine}
                </Badge>
              )}
            </div>

            {circle.tags && circle.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {circle.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="ml-4">
            <Share2 className="h-4 w-4 mr-1" />
            Share Circle
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function CircleFeedSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
      </Card>

      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CircleFeedContent() {
  const params = useParams();
  const circleId = params.circleId as string;
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch circle details
  const { 
    data: circle, 
    isLoading: circleLoading, 
    error: circleError,
    refetch: refetchCircle 
  } = useQuery<Circle>({
    queryKey: [`/api/circles/${circleId}`, refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Circle not found");
        }
        if (response.status === 403) {
          throw new Error("You don't have permission to view this circle");
        }
        throw new Error("Failed to load circle details");
      }
      return response.json();
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 403/404 errors
      if (error?.message?.includes("permission") || error?.message?.includes("not found")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Fetch circle feed
  const { 
    data: feedItems = [], 
    isLoading: feedLoading, 
    error: feedError,
    refetch: refetchFeed 
  } = useQuery<CircleFeedItem[]>({
    queryKey: [`/api/circles/${circleId}/feed`, refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/circles/${circleId}/feed`);
      if (!response.ok) {
        throw new Error("Failed to load circle feed");
      }
      return response.json();
    },
    enabled: !!circle, // Only fetch feed if circle data is available
    staleTime: 30000, // Cache for 30 seconds
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const isLoading = circleLoading || feedLoading;
  const error = circleError || feedError;

  if (isLoading) {
    return <CircleFeedSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.message || "Something went wrong loading this circle."}
          </AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Circle not found or you don't have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* Circle Metadata */}
      <CircleMetadata circle={circle} />

      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Shared Lists</h2>
          <p className="text-sm text-muted-foreground">
            {feedItems.length} list{feedItems.length !== 1 ? 's' : ''} shared in this circle
          </p>
        </div>
        
        <Button onClick={handleRefresh} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Feed Content */}
      {feedItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Share2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium">No lists shared yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                When members share their restaurant lists to this circle, they'll appear here for everyone to discover.
              </p>
              {circle.memberCount === 1 && (
                <p className="text-xs text-muted-foreground">
                  Invite more members to start building your circle's collection!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedItems.map((item) => (
            <div key={item.id} className="space-y-2">
              {/* Shared by indicator */}
              {item.sharedBy && item.sharedBy.id !== item.creator.id && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  Shared by <span className="font-medium">@{item.sharedBy.username}</span>
                  {item.sharedAt && (
                    <span>• {new Date(item.sharedAt).toLocaleDateString()}</span>
                  )}
                </div>
              )}
              
              {/* List Card */}
              <RestaurantListCard
                id={item.id}
                name={item.name}
                description={item.description}
                createdById={item.createdById}
                type={item.type}
                visibility={item.visibility}
                tags={item.tags}
                restaurantCount={item.restaurantCount}
                coverImage={item.coverImage}
                createdAt={item.createdAt}
                creator={item.creator}
                sharedWithCircles={[]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CircleFeed() {
  return (
    <PermissionGuard>
      <CircleFeedContent />
    </PermissionGuard>
  );
}
