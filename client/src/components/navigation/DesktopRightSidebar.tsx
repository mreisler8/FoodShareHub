import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Rating } from "@/components/ui/rating";
import { Search, Pizza, Coffee, GlassWater } from "lucide-react";
import { Link } from "wouter";
import { PopularRestaurant, FriendActivity, HubWithStats } from "@/lib/types";

export function DesktopRightSidebar() {
  // For now we'll use static data since these would normally come from API endpoints
  // In a real application, you would fetch this data from the backend
  
  const popularRestaurants: PopularRestaurant[] = [
    {
      id: 1,
      name: "Spice Avenue",
      category: "Indian",
      priceRange: "$$",
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      rating: 4.5,
      reviewCount: 328
    },
    {
      id: 2,
      name: "Green Garden Café",
      category: "Vegetarian",
      priceRange: "$",
      image: "https://images.unsplash.com/photo-1564758866811-4780aa0a1f49?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      rating: 4.0,
      reviewCount: 156
    },
    {
      id: 3,
      name: "Burger Junction",
      category: "American",
      priceRange: "$$",
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      rating: 5.0,
      reviewCount: 214
    }
  ];
  
  const friendsActivity: FriendActivity[] = [
    {
      id: 1,
      userId: 3,
      userName: "Lisa Wang",
      profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      activityType: "rated",
      targetName: "Coastal Seafood",
      targetId: 4,
      timeAgo: "35 minutes ago",
      rating: 5
    },
    {
      id: 2,
      userId: 4,
      userName: "Tom Garcia",
      profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      activityType: "joined",
      targetName: "Vegan Eats NYC",
      targetId: 3,
      timeAgo: "2 hours ago"
    },
    {
      id: 3,
      userId: 5,
      userName: "Maria Johnson",
      profilePicture: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80",
      activityType: "posted",
      targetName: "Brasserie Paris",
      targetId: 5,
      timeAgo: "5 hours ago"
    }
  ];
  
  const suggestedCircles: HubWithStats[] = [
    {
      id: 4,
      name: "Pizza Enthusiasts",
      description: "For lovers of all things pizza",
      category: "Food",
      image: "",
      createdAt: new Date(),
      isPrivate: false,
      tags: ["Pizza", "Italian"],
      creatorId: 1,
      memberCount: 6200
    },
    {
      id: 5,
      name: "Coffee Culture",
      description: "Discussing the best cafes and coffee",
      category: "Beverage",
      image: "",
      createdAt: new Date(),
      isPrivate: false,
      tags: ["Coffee", "Cafe"],
      creatorId: 1,
      memberCount: 8300
    },
    {
      id: 6,
      name: "Craft Cocktails NYC",
      description: "Exploring NYC's cocktail scene",
      category: "Nightlife",
      image: "",
      createdAt: new Date(),
      isPrivate: false,
      tags: ["Cocktails", "Bars"],
      creatorId: 1,
      memberCount: 4700
    }
  ];

  const getCircleIcon = (name: string) => {
    if (name.toLowerCase().includes("pizza")) return <Pizza className="text-xs" />;
    if (name.toLowerCase().includes("coffee")) return <Coffee className="text-xs" />;
    if (name.toLowerCase().includes("cocktail")) return <GlassWater className="text-xs" />;
    return <Pizza className="text-xs" />;
  };

  const getCircleColor = (index: number) => {
    const colors = ["bg-primary", "bg-secondary", "bg-warning"];
    return colors[index % colors.length];
  };

  return (
    <div className="hidden xl:block w-72 p-5 h-screen sticky top-0 bg-white border-l border-neutral-200">
      {/* Search Bar */}
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="Search restaurants, dishes, people..."
          className="w-full py-2 pl-10 pr-4 bg-neutral-100 rounded-lg text-sm"
        />
        <Search className="absolute left-3 top-2.5 text-neutral-500 h-4 w-4" />
      </div>
      
      {/* Popular Near You */}
      <div className="mb-8">
        <h3 className="font-heading font-bold text-neutral-900 mb-4">Popular Near You</h3>
        <div className="space-y-4">
          {popularRestaurants.map((restaurant) => (
            <div key={restaurant.id} className="flex items-start">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-100">
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ml-3">
                <h4 className="font-medium text-sm">{restaurant.name}</h4>
                <p className="text-xs text-neutral-500">{restaurant.category} • {restaurant.priceRange}</p>
                <div className="flex items-center mt-1">
                  <Rating value={restaurant.rating} size="sm" />
                  <span className="ml-1 text-xs text-neutral-700">({restaurant.reviewCount})</span>
                </div>
              </div>
            </div>
          ))}
          
          <Link href="/discover" className="text-secondary text-sm font-medium">
            View more restaurants
          </Link>
        </div>
      </div>
      
      {/* Friends Activity */}
      <div className="mb-8">
        <h3 className="font-heading font-bold text-neutral-900 mb-4">Friends Activity</h3>
        <div className="space-y-4">
          {friendsActivity.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activity.profilePicture} alt={activity.userName} />
                <AvatarFallback>{activity.userName[0]}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm">
                  <span className="font-medium">{activity.userName}</span> 
                  <span className="text-neutral-700"> {activity.activityType} </span> 
                  <span className="font-medium">{activity.targetName}</span> 
                  {activity.activityType === 'rated' && (
                    <span className="text-neutral-700"> ⭐ {activity.rating} stars</span>
                  )}
                  {activity.activityType === 'joined' && (
                    <span className="text-neutral-700"> circle</span>
                  )}
                </p>
                <p className="text-xs text-neutral-500">{activity.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Suggested Circles */}
      <div>
        <h3 className="font-heading font-bold text-neutral-900 mb-4">Suggested Circles</h3>
        <div className="space-y-3">
          {suggestedCircles.map((circle, index) => (
            <div key={circle.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-lg ${getCircleColor(index)} flex items-center justify-center text-white`}>
                  {getCircleIcon(circle.name)}
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium">{circle.name}</h4>
                  <p className="text-xs text-neutral-500">{(circle.memberCount / 1000).toFixed(1)}k members</p>
                </div>
              </div>
              <button className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-lg">Join</button>
            </div>
          ))}
          
          <Link href="/discover" className="text-secondary text-sm font-medium">
            Discover more circles
          </Link>
        </div>
      </div>
    </div>
  );
}
