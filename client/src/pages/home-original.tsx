import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Plus, TrendingUp, Star, MapPin, Users, List, Settings, Search } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

// Quick Actions Section
function QuickActions() {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/create-post">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Share Experience</h3>
                <p className="text-sm text-gray-600">Post about your dining experience</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/lists/create">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-full">
                <List className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create List</h3>
                <p className="text-sm text-gray-600">Curate & rank restaurants</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/create-circle">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create Circle</h3>
                <p className="text-sm text-gray-600">Start a food community</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// Welcome Section
function WelcomeSection({ user }: { user: any }) {
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-blue-100">Discover and share amazing dining experiences with your circles.</p>
      </div>
    </div>
  );
}

// Simple Feed Preview
function FeedPreview() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['/api/feed'],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  const recentPosts = posts?.slice(0, 3) || [];

  return (
    <div className="space-y-4">
      {recentPosts.map((post: any) => (
        <Card key={post.id} className="p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-gray-100 rounded-full p-2">
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900">{post.author?.name || 'Anonymous'}</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">{post.restaurant?.name || 'Restaurant'}</span>
              </div>
              <p className="text-gray-700 text-sm">{post.content}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>⭐ {post.rating}/5</span>
                <span>👍 {post.likes || 0}</span>
                <span>💬 {post.comments || 0}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      {isMobile && <MobileNavigation />}

      {/* Desktop Layout */}
      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && <DesktopSidebar />}

        {/* Main Content */}
        <div className={`flex-1 ${!isMobile ? 'ml-64' : ''}`}>
          <div className="max-w-4xl mx-auto p-6 pb-20">
            {/* Welcome Section */}
            <WelcomeSection user={user} />

            {/* Quick Actions */}
            <QuickActions />

            {/* Recent Activity */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                <Link href="/feed">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              <FeedPreview />
            </div>

            {/* Popular Restaurants */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Trending Restaurants</h2>
                <Link href="/discover">
                  <Button variant="outline" size="sm">
                    Explore
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="bg-gray-100 h-32 rounded-lg mb-3"></div>
                    <h3 className="font-medium text-gray-900">Restaurant {i}</h3>
                    <p className="text-sm text-gray-600">Location • Cuisine</p>
                    <div className="flex items-center mt-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">4.{i + 2}/5</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}