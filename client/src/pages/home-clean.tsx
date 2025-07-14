import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Plus, TrendingUp, Star, MapPin, Users, List } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: posts } = useQuery({
    queryKey: ['/api/feed'],
  });

  const { data: lists } = useQuery({
    queryKey: ['/api/lists'],
  });

  const { data: circles } = useQuery({
    queryKey: ['/api/circles'],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile && <MobileNavigation />}

      <div className="flex">
        {!isMobile && <DesktopSidebar />}

        <div className={`flex-1 ${!isMobile ? 'ml-64' : ''}`}>
          <div className="max-w-4xl mx-auto p-6 pb-20">
            
            {/* Welcome Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600">
                Discover and share amazing dining experiences with your circles.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/create-post">
                  <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Share Experience</h3>
                        <p className="text-sm text-gray-600">Post about your meal</p>
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
                        <h3 className="font-medium">Create List</h3>
                        <p className="text-sm text-gray-600">Curate restaurants</p>
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
                        <h3 className="font-medium">Create Circle</h3>
                        <p className="text-sm text-gray-600">Start a community</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <Link href="/feed">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              
              <div className="space-y-4">
                {posts?.slice(0, 3).map((post: any) => (
                  <Card key={post.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gray-100 rounded-full p-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{post.author?.name}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{post.restaurant?.name}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{post.content}</p>
                      </div>
                    </div>
                  </Card>
                )) || (
                  <Card className="p-8 text-center">
                    <p className="text-gray-500">No recent activity. Start sharing your experiences!</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Your Lists */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Lists</h2>
                <Link href="/lists">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lists?.slice(0, 4).map((list: any) => (
                  <Card key={list.id} className="p-4">
                    <h3 className="font-medium mb-2">{list.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{list.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {list.itemCount || 0} restaurants
                      </span>
                      <Link href={`/lists/${list.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </Card>
                )) || (
                  <Card className="p-8 text-center col-span-2">
                    <p className="text-gray-500">No lists yet. Create your first list!</p>
                  </Card>
                )}
              </div>
            </div>

            {/* Your Circles */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Your Circles</h2>
                <Link href="/circles">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {circles?.slice(0, 4).map((circle: any) => (
                  <Card key={circle.id} className="p-4">
                    <h3 className="font-medium mb-2">{circle.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{circle.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {circle.memberCount || 0} members
                      </span>
                      <Link href={`/circles/${circle.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </Card>
                )) || (
                  <Card className="p-8 text-center col-span-2">
                    <p className="text-gray-500">No circles yet. Join or create your first circle!</p>
                  </Card>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}