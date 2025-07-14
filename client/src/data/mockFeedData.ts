export const mockPosts = [
  {
    id: 1,
    userId: 1,
    restaurantId: 1,
    content: "Amazing pasta at this local Italian place! The carbonara was perfection.",
    rating: 5,
    createdAt: new Date().toISOString(),
    user: {
      id: 1,
      name: "Sarah Chen",
      username: "sarahc",
      profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
    },
    restaurant: {
      id: 1,
      name: "Mama's Italian Kitchen",
      location: "Downtown",
      category: "Italian",
      priceRange: "$$"
    }
  }
];

export const mockLists = [
  {
    id: 1,
    name: "Best Brunch Spots",
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
    itemCount: 5
  }
];

export const mockCircles = [
  {
    id: 1,
    name: "NYC Food Lovers",
    description: "Best restaurants in the five boroughs",
    memberCount: 24,
    isPrivate: false
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