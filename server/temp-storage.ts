// Temporary in-memory storage for saved lists while database is unavailable
import { SavedList, InsertSavedList, RestaurantList, RestaurantListItem } from "@shared/schema";

// In-memory storage for saved lists
let savedListsStore: SavedList[] = [];
let nextSavedListId = 1;

// In-memory storage for restaurant lists
let restaurantListsStore: RestaurantList[] = [];
let nextRestaurantListId = 1;

// In-memory storage for restaurant list items
let restaurantListItemsStore: RestaurantListItem[] = [];
let nextRestaurantListItemId = 1;

// Mock data for testing
const mockLists: RestaurantList[] = [
  {
    id: 1,
    name: "Best Pizza Places",
    description: "My favorite pizza spots in the city",
    tags: ["pizza", "casual"],
    shareWithCircle: false,
    makePublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 1,
    circleId: null,
    isPublic: true,
    primaryLocation: "Toronto",
    locationLat: null,
    locationLng: null,
    visibility: { public: true, followers: false, circleIds: [] },
    allowSharing: true,
    shareableCircles: [],
    isFeatured: false,
    viewCount: 0,
    saveCount: 0,
    type: "restaurant",
    audience: "public",
    coverImage: null
  },
  {
    id: 2,
    name: "Fine Dining Favorites",
    description: "Special occasion restaurants",
    tags: ["fine dining", "romantic"],
    shareWithCircle: false,
    makePublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 1,
    circleId: null,
    isPublic: true,
    primaryLocation: "Toronto",
    locationLat: null,
    locationLng: null,
    visibility: { public: true, followers: false, circleIds: [] },
    allowSharing: true,
    shareableCircles: [],
    isFeatured: false,
    viewCount: 0,
    saveCount: 0,
    type: "restaurant",
    audience: "public",
    coverImage: null
  },
  {
    id: 3,
    name: "Quick Lunch Spots",
    description: "Fast and delicious lunch options",
    tags: ["lunch", "quick"],
    shareWithCircle: false,
    makePublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 1,
    circleId: null,
    isPublic: false,
    primaryLocation: "Toronto",
    locationLat: null,
    locationLng: null,
    visibility: { public: false, followers: true, circleIds: [] },
    allowSharing: true,
    shareableCircles: [],
    isFeatured: false,
    viewCount: 0,
    saveCount: 0,
    type: "restaurant",
    audience: "profile",
    coverImage: null
  }
];

// Initialize the restaurant lists store with mock data
restaurantListsStore = [...mockLists];

export class TempSavedListStorage {
  // Save a list
  async createSavedList(insertSavedList: InsertSavedList): Promise<SavedList> {
    const savedList: SavedList = {
      id: nextSavedListId++,
      ...insertSavedList,
      savedAt: new Date()
    };
    savedListsStore.push(savedList);
    return savedList;
  }

  // Get saved lists for a user
  async getSavedListsByUser(userId: number): Promise<RestaurantList[]> {
    const userSavedLists = savedListsStore.filter(sl => sl.userId === userId);
    
    // Return lists that match saved list IDs
    return restaurantListsStore.filter(list => 
      userSavedLists.some(saved => saved.listId === list.id)
    );
  }

  // Delete a saved list
  async deleteSavedList(listId: number, userId: number): Promise<void> {
    savedListsStore = savedListsStore.filter(
      sl => !(sl.listId === listId && sl.userId === userId)
    );
  }

  // Check if a list is saved by a user
  async isListSavedByUser(listId: number, userId: number): Promise<boolean> {
    return savedListsStore.some(
      sl => sl.listId === listId && sl.userId === userId
    );
  }

  // Get all available lists (for testing)
  async getAllLists(): Promise<RestaurantList[]> {
    return restaurantListsStore;
  }

  // Enhanced Create & Rank Lists functionality
  async createRestaurantList(data: any): Promise<RestaurantList> {
    const newList: RestaurantList = {
      id: nextRestaurantListId++,
      name: data.name,
      description: data.description || null,
      createdById: data.createdById,
      circleId: data.circleId || null,
      isPublic: data.makePublic || false,
      tags: data.tags || [],
      type: data.type || "restaurant",
      audience: data.audience || "profile",
      coverImage: data.coverImage || null,
      primaryLocation: data.primaryLocation || null,
      locationLat: null,
      locationLng: null,
      visibility: data.visibility || { public: false, followers: true, circleIds: [] },
      allowSharing: true,
      shareableCircles: [],
      isFeatured: false,
      shareWithCircle: data.shareWithCircle || false,
      makePublic: data.makePublic || false,
      viewCount: 0,
      saveCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    restaurantListsStore.push(newList);
    
    // Add list items if provided
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        await this.createRestaurantListItem({
          listId: newList.id,
          ...item,
          addedById: data.createdById
        });
      }
    }
    
    return newList;
  }

  async createRestaurantListItem(data: any): Promise<RestaurantListItem> {
    const newItem: RestaurantListItem = {
      id: nextRestaurantListItemId++,
      listId: data.listId,
      restaurantId: data.restaurantId || null,
      rating: data.rating || null,
      priceAssessment: data.priceAssessment || null,
      liked: data.liked || null,
      disliked: data.disliked || null,
      notes: data.notes || null,
      mustTryDishes: data.mustTryDishes || [],
      addedById: data.addedById,
      position: data.position || 0,
      rank: data.rank || 0,
      name: data.name || "",
      tags: data.tags || [],
      city: data.city || null,
      mediaUrl: data.mediaUrl || null,
      addedAt: new Date(),
    };
    
    restaurantListItemsStore.push(newItem);
    return newItem;
  }

  async getRestaurantListsByUser(userId: number): Promise<RestaurantList[]> {
    return restaurantListsStore.filter(list => list.createdById === userId);
  }

  async getRestaurantListById(listId: number): Promise<RestaurantList | null> {
    return restaurantListsStore.find(list => list.id === listId) || null;
  }

  async getRestaurantListItems(listId: number): Promise<RestaurantListItem[]> {
    return restaurantListItemsStore.filter(item => item.listId === listId);
  }
}

export const tempSavedListStorage = new TempSavedListStorage();