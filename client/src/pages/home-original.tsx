import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen, Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  // Redirect to auth if not logged in
  if (!isLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">Discover and share amazing restaurant experiences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create List
            </CardTitle>
            <CardDescription>
              Start a new restaurant list to share your favorites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/create-list">
              <Button className="w-full">Create New List</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Circles
            </CardTitle>
            <CardDescription>
              Join or create circles with fellow food lovers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/circles">
              <Button variant="outline" className="w-full">Browse Circles</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Picks
            </CardTitle>
            <CardDescription>
              Discover trending restaurants and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/top-picks">
              <Button variant="outline" className="w-full">Explore Picks</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Recent Activity</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-500 text-center">
                Your recent lists and recommendations will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}