import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, ChefHat, DollarSign, TrendingUp, Star } from "lucide-react";

interface CircleSuggestion extends Circle {
  score?: number;
}

export function PersonalizedSuggestions() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  // Fetch personalized circle suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["/api/circles/suggestions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/circles/suggestions");
      return res.json();
    },
    enabled: !!currentUser,
  });

  // Join circle mutation
  const joinCircleMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest("POST", `/api/circles/join/${inviteCode}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circles/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circles/user"] });
      
      toast({
        title: "Welcome to the circle!",
        description: `You've joined ${data.circle.name} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join circle",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleJoinCircle = (circle: CircleSuggestion) => {
    if (circle.inviteCode) {
      joinCircleMutation.mutate(circle.inviteCode);
    }
  };

  const getPriceRangeDisplay = (priceRange: string) => {
    const ranges = {
      "$": "Budget-friendly",
      "$$": "Moderate",
      "$$$": "Upscale", 
      "$$$$": "Fine dining"
    };
    return ranges[priceRange as keyof typeof ranges] || priceRange;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!suggestions?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No suggestions yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            We'll suggest circles based on your dining preferences once you start using the app.
          </p>
          <Link href="/circles">
            <Button variant="outline">
              Browse All Circles
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suggested for You</h3>
          <p className="text-sm text-muted-foreground">Based on your dining preferences</p>
        </div>
      </div>

      <div className="grid gap-4">
        {suggestions.map((circle: CircleSuggestion) => (
          <Card key={circle.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{circle.name}</CardTitle>
                  {circle.description && (
                    <CardDescription className="mt-1 line-clamp-2">
                      {circle.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {circle.featured && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {circle.trending && (
                    <Badge variant="outline" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {circle.primaryCuisine && (
                  <Badge variant="outline" className="text-xs">
                    <ChefHat className="h-3 w-3 mr-1" />
                    {circle.primaryCuisine}
                  </Badge>
                )}
                {circle.priceRange && (
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {getPriceRangeDisplay(circle.priceRange)}
                  </Badge>
                )}
                {circle.location && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {circle.location}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  {circle.memberCount || 0} members
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleJoinCircle(circle)}
                  disabled={joinCircleMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {joinCircleMutation.isPending ? "Joining..." : "Join Circle"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}