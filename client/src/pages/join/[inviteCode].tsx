import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, ChefHat, DollarSign, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function JoinCirclePage() {
  const [, params] = useRoute("/join/:inviteCode");
  const [, navigate] = useLocation();
  const inviteCode = params?.inviteCode;
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  // Fetch circle info by invite code
  const { data: circle, isLoading, error } = useQuery({
    queryKey: [`/api/circles/invite/${inviteCode}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/circles/invite/${inviteCode}`);
      return res.json();
    },
    enabled: !!inviteCode,
  });

  // Join circle mutation
  const joinCircleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/circles/join/${inviteCode}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circles/user"] });
      
      toast({
        title: "Welcome to the circle!",
        description: `You've joined ${data.circle.name} successfully.`,
      });
      
      // Navigate to the circle page
      navigate(`/circles/${data.circle.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join circle",
        description: error.message || "Unable to join this circle.",
        variant: "destructive",
      });
    },
  });

  // Auto-join if user is authenticated and circle allows it
  useEffect(() => {
    if (currentUser && circle && circle.allowPublicJoin && !joinCircleMutation.isPending) {
      // Small delay to show the preview
      setTimeout(() => {
        joinCircleMutation.mutate();
      }, 1500);
    }
  }, [currentUser, circle]);

  const getPriceRangeDisplay = (priceRange: string) => {
    const ranges = {
      "$": "Budget-friendly",
      "$$": "Moderate",
      "$$$": "Upscale", 
      "$$$$": "Fine dining"
    };
    return ranges[priceRange as keyof typeof ranges] || priceRange;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Join Circle</CardTitle>
            <CardDescription>
              You need to sign in to join this circle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate(`/login?redirect=/join/${inviteCode}`)}
            >
              Sign In to Join
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate(`/register?redirect=/join/${inviteCode}`)}
            >
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading circle...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invite Code</CardTitle>
            <CardDescription>
              This invite code is not valid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/circles")}
            >
              Browse All Circles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joinCircleMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Welcome to {circle.name}!</CardTitle>
            <CardDescription>
              You've successfully joined the circle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full"
              onClick={() => navigate(`/circles/${circle.id}`)}
            >
              Explore Circle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Join Circle</CardTitle>
          <CardDescription>
            You've been invited to join a food community
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Circle Info */}
          <div className="border rounded-lg p-4 bg-white">
            <h3 className="font-semibold text-lg mb-2">{circle.name}</h3>
            {circle.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {circle.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
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

            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="h-4 w-4 mr-1" />
              {circle.memberCount || 0} members
            </div>
          </div>

          {/* Join Action */}
          {circle.allowPublicJoin ? (
            <div className="space-y-3">
              {joinCircleMutation.isPending ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-muted-foreground">Joining circle...</span>
                </div>
              ) : (
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => joinCircleMutation.mutate()}
                  disabled={joinCircleMutation.isPending}
                >
                  Join {circle.name}
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 text-center">
                This circle has restricted joining. Contact the circle owner for access.
              </p>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/circles")}
          >
            Browse Other Circles
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}