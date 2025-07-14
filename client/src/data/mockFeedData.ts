
export const mockFeed = [
  {
    type: "list",
    id: "1",
    title: "Best of Madrid",
    image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop",
    user: { 
      name: "David Lee", 
      handle: "@david.eats", 
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
    },
    saved: false,
    followed: false,
    restaurantCount: 12
  },
  {
    type: "circle",
    id: "2",
    name: "Tokyo Eats",
    members: 48,
    icon: "🍜",
    description: "Best ramen and sushi spots in Tokyo"
  },
  {
    type: "list",
    id: "3",
    title: "NYC Pizza Guide",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
    user: { 
      name: "Emma Wilson", 
      handle: "@emma.foodie", 
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face"
    },
    saved: true,
    followed: true,
    restaurantCount: 8
  },
  {
    type: "tag",
    id: "4",
    tag: "#BrunchGoals"
  },
  {
    type: "circle",
    id: "5",
    name: "Little Cactus",
    members: 23,
    icon: "🌵",
    description: "Mexican food lovers unite"
  },
  {
    type: "tag",
    id: "6",
    tag: "#Farmer'sMarket"
  },
  {
    type: "list",
    id: "7",
    title: "SF Coffee Culture",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
    user: { 
      name: "Sophie Wang", 
      handle: "@sophie.brew", 
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face"
    },
    saved: false,
    followed: false,
    restaurantCount: 15
  }
];

export const suggestedUsers = [
  {
    id: "1",
    name: "Emma Wilson",
    handle: "@emma.foodie",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face",
    followed: false
  },
  {
    id: "2", 
    name: "David Lee",
    handle: "@david.eats",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
    followed: false
  },
  {
    id: "3",
    name: "Sophie Wang", 
    handle: "@sophie.brew",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
    followed: false
  },
  {
    id: "4",
    name: "Alex Chen",
    handle: "@alex.tastes",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
    followed: false
  }
];
