// Temporary in-memory storage for development while database is being stabilized
import { SelectUser } from "@shared/schema";

let tempUsers: SelectUser[] = [];
let tempUserCounter = 1;

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
    if (tempUsers.length === 0) {
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      // Create demo user with password "demo123"
      let salt = randomBytes(16).toString("hex");
      let buf = (await scryptAsync("demo123", salt, 64)) as Buffer;
      let hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      tempUsers.push({
        id: 1,
        username: "demo@example.com",
        password: hashedPassword,
        name: "Demo User",
        bio: "Demo user for development",
        profilePicture: null,
        preferredCuisines: null,
        preferredPriceRange: null,
        preferredLocation: null,
        diningInterests: null,
        favoriteFood: null,
        favoriteRestaurant: null,
      });

      // Create your account with password "password123"
      salt = randomBytes(16).toString("hex");
      buf = (await scryptAsync("password123", salt, 64)) as Buffer;
      hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      tempUsers.push({
        id: 2,
        username: "mitch.reisler@gmail.com",
        password: hashedPassword,
        name: "Mitch Reisler",
        bio: "Founder of Circles - connecting food lovers through trusted recommendations",
        profilePicture: null,
        preferredCuisines: "Italian, Asian, Mediterranean",
        preferredPriceRange: "$$ - $$$",
        preferredLocation: "Toronto, ON",
        diningInterests: "Fine dining, local gems, authentic cuisines",
        favoriteFood: "Fresh pasta",
        favoriteRestaurant: "Local Italian spot",
      });
    }
  }
};

// Initialize on import
tempStorage.init();

// Export for use in other files
export { tempStorage };