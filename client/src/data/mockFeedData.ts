
// Mock data for development and fallback scenarios
export const mockLists = [
  {
    id: 1,
    name: "Best Brunch Spots in NYC",
    description: "My favorite weekend brunch places",
    createdById: 1,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: 1,
      name: "Sarah Chen",
      username: "sarahc",
      profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
    },
    itemCount: 8,
    tags: ["brunch", "weekend", "nyc"]
  },
  {
    id: 2,
    name: "Tokyo Food Adventures",
    description: "Incredible eats from my Japan trip",
    createdById: 2,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: {
      id: 2,
      name: "Mike Johnson",
      username: "mikej",
      profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
    },
    itemCount: 12,
    tags: ["tokyo", "japan", "travel"]
  }
];

export const mockCircles = [
  {
    id: 1,
    name: "NYC Foodies",
    description: "Best restaurants in the five boroughs",
    memberCount: 247,
    isPrivate: false,
    creator: {
      name: "Food Enthusiast",
      username: "foodie_nyc"
    }
  },
  {
    id: 2,
    name: "Coffee Connoisseurs",
    description: "Third wave coffee shops and roasters",
    memberCount: 89,
    isPrivate: false,
    creator: {
      name: "Bean Counter",
      username: "coffee_pro"
    }
  }
];

export const mockUsers = [
  {
    id: 1,
    name: "Emma Wilson",
    username: "emmaw",
    profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    bio: "Food blogger and restaurant explorer"
  },
  {
    id: 2,
    name: "David Park",
    username: "davidp",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    bio: "Chef and culinary instructor"
  }
];
