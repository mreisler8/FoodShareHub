// Temporary in-memory storage for development while database is being stabilized
import { SelectUser } from "@shared/schema";

let tempUsers: SelectUser[] = [
  {
    id: 1,
    username: "mitch.reisler@gmail.com",
    password: "$2b$10$rG.KQBW8mH8FqKlYGZH9.eJ8vQb8YhYZKt8P9g8nHvDzLQEeQKhP6", // password: "password123"
    name: "Mitch Reisler",
    bio: "Product lead building Circles",
    profilePicture: null,
    preferredCuisines: null,
    preferredPriceRange: null,
    preferredLocation: null,
    diningInterests: null,
    favoriteFood: null,
    favoriteRestaurant: null
  },
  {
    id: 2,
    username: "demo@example.com",
    password: "$2b$10$rG.KQBW8mH8FqKlYGZH9.eJ8vQb8YhYZKt8P9g8nHvDzLQEeQKhP6", // password: "password123"
    name: "Demo User",
    bio: "Demo user for development",
    profilePicture: null,
    preferredCuisines: null,
    preferredPriceRange: null,
    preferredLocation: null,
    diningInterests: null,
    favoriteFood: null,
    favoriteRestaurant: null
  }
];
let tempUserCounter = 3;

const tempStorage = {
  // User management
  async createUser(userData: any): Promise<SelectUser> {
    const user: SelectUser = {
      id: tempUserCounter++,
      username: userData.username,
      password: userData.password,
      name: userData.name,
      bio: userData.bio || null,
      profilePicture: userData.profilePicture || null,
      preferredCuisines: userData.preferredCuisines || null,
      preferredPriceRange: userData.preferredPriceRange || null,
      preferredLocation: userData.preferredLocation || null,
      diningInterests: userData.diningInterests || null,
      favoriteFood: userData.favoriteFood || null,
      favoriteRestaurant: userData.favoriteRestaurant || null,
    };
    tempUsers.push(user);
    return user;
  },

  async getUserByUsername(username: string): Promise<SelectUser | null> {
    return tempUsers.find(user => user.username === username) || null;
  },

  async getUser(id: number): Promise<SelectUser | null> {
    return tempUsers.find(user => user.id === id) || null;
  },

  async updateUser(id: number, userData: Partial<SelectUser>): Promise<SelectUser | null> {
    const userIndex = tempUsers.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    tempUsers[userIndex] = { ...tempUsers[userIndex], ...userData };
    return tempUsers[userIndex];
  },

  // Initialize with demo user and your account
  async init() {
    // No need to initialize here since we have hardcoded the users above
  }
};

// Initialize on import
// tempStorage.init(); // No need to init

// Export for use in other files
export { tempStorage };