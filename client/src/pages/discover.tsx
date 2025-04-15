import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { DesktopRightSidebar } from "@/components/navigation/DesktopRightSidebar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { CreatePostButton } from "@/components/create-post/CreatePostButton";
import { Search, Filter, MapPin, Utensils, Users } from "lucide-react";
import { Link } from "wouter";
import { Restaurant, Circle } from "@shared/schema";
import { CircleWithStats } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("restaurants");
  
  // Fetch restaurants
  const { data: restaurants, isLoading: isRestaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: [`/api/restaurants${searchQuery ? `?query=${searchQuery}` : ""}`],
  });
  
  // Fetch circles
  const { data: circles, isLoading: isCirclesLoading } = useQuery<CircleWithStats[]>({
    queryKey: ["/api/circles"],
  });
  
  // Fetch users (not implemented in API yet)
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically update based on the state change
  };

  return (
    <div className="flex min-h-screen mb-16 md:mb-0">
      {/* Mobile navigation at bottom of screen */}
      <MobileNavigation />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto px-4 py-6 md:px-8">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-heading font-bold text-neutral-900 mb-4">Discover</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-neutral-500 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search restaurants, cuisine, area..."
                className="w-full py-2 pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select className="px-3 py-2 rounded-md border border-input bg-background text-sm" 
                      onChange={(e) => setRegion(e.target.value)}>
                <option value="">All Canada</option>
                <option value="BC">British Columbia</option>
                <option value="ON">Ontario</option>
                <option value="QC">Quebec</option>
                <option value="AB">Alberta</option>
                <option value="MB">Manitoba</option>
                <option value="SK">Saskatchewan</option>
                <option value="NS">Nova Scotia</option>
                <option value="NB">New Brunswick</option>
                <option value="NL">Newfoundland and Labrador</option>
                <option value="PE">Prince Edward Island</option>
                <option value="YT">Yukon</option>
                <option value="NT">Northwest Territories</option>
                <option value="NU">Nunavut</option>
              </select>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
            </div>
          </form>
        </header>
        
        {/* Content Tabs */}
        <Tabs defaultValue="restaurants" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger 
              value="restaurants"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "restaurants" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              Restaurants
            </TabsTrigger>
            <TabsTrigger 
              value="circles"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "circles" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              Food Circles
            </TabsTrigger>
            <TabsTrigger 
              value="people"
              className={`rounded-none border-b-2 pb-2 pt-0 px-4 font-medium ${
                activeTab === "people" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-200"
              }`}
            >
              People
            </TabsTrigger>
          </TabsList>
          
          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            {isRestaurantsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(4).fill(0).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : restaurants && restaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restaurants.map((restaurant) => (
                  <Card key={restaurant.id} className="overflow-hidden transition-transform duration-200 hover:translate-y-[-4px]">
                    <div className="relative h-40">
                      {/* In a real app, this would use the restaurant's image */}
                      <img 
                        src={`https://images.unsplash.com/photo-${restaurant.id === 1 
                          ? "1555396273-367ea4eb4db5" 
                          : restaurant.id === 2 
                          ? "1517248135467-4c7edcad34c4" 
                          : "1552566626-52f8b828add9"}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`}
                        alt={restaurant.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-lg font-medium mb-1">{restaurant.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Rating value={4} size="sm" />
                        <span className="text-sm text-neutral-500">(24 reviews)</span>
                      </div>
                      <div className="flex flex-wrap gap-y-1 text-sm text-neutral-700">
                        <div className="flex items-center mr-3">
                          <MapPin className="h-3 w-3 mr-1 text-primary" /> {restaurant.location}
                        </div>
                        <div className="flex items-center">
                          <Utensils className="h-3 w-3 mr-1 text-primary" /> {restaurant.category} • {restaurant.priceRange}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                {searchQuery ? (
                  <p className="text-neutral-500">No restaurants found matching "{searchQuery}"</p>
                ) : (
                  <p className="text-neutral-500">No restaurants available</p>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Food Circles Tab */}
          <TabsContent value="circles" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            {isCirclesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-32 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : circles && circles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {circles.map((circle) => (
                  <Link key={circle.id} href={`/circles/${circle.id}`} className="block">
                      <Card className="overflow-hidden transition-transform duration-200 hover:translate-y-[-4px]">
                        <div className="relative h-32">
                          <img 
                            src={circle.image} 
                            alt={circle.name} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <h3 className="absolute bottom-3 left-3 text-white font-bold font-heading">{circle.name}</h3>
                        </div>
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-sm text-neutral-700">
                              <Users className="inline-block h-3 w-3 mr-1" />
                              {(circle.memberCount / 1000).toFixed(1)}k members
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" className="text-secondary h-7 px-2">Join</Button>
                        </CardContent>
                      </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                <p className="text-neutral-500">No food circles available</p>
              </div>
            )}
          </TabsContent>
          
          {/* People Tab */}
          <TabsContent value="people" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            {isUsersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <Link key={user.id} href={`/profile/${user.id}`} className="block">
                      <Card className="p-4 transition-transform duration-200 hover:translate-y-[-4px]">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.profilePicture} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-neutral-900">{user.name}</h3>
                            <p className="text-sm text-neutral-500">@{user.username}</p>
                          </div>
                          <Button variant="outline" size="sm" className="ml-auto h-8">
                            Follow
                          </Button>
                        </div>
                      </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                <p className="text-neutral-500">No users found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Floating Action Button */}
        <CreatePostButton />
      </div>
      
      {/* Right Sidebar (Desktop Only) */}
      <DesktopRightSidebar />
    </div>
  );
}
