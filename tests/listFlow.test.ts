
import request from 'supertest';
import { db } from '../server/db';
import { users, restaurants, restaurantLists, restaurantListItems } from '../shared/schema';
import app from '../server/index';

describe('List & Recommendation API Flow', () => {
  let agent: any;
  let listId: number;
  let restaurantId: number;
  let userId: number;

  beforeAll(async () => {
    // Create agent to maintain session cookies
    agent = request.agent(app);
    
    // 1. Create a test user directly in the DB
    const [user] = await db
      .insert(users)
      .values({ 
        username: 'e2e_test@example.com', 
        password: 'hashedpassword123', // In real app this would be hashed
        name: 'E2E Tester' 
      })
      .returning();
    userId = user.id;
    
    // 2. Log in via the auth endpoint to establish session
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'e2e_test@example.com', password: 'hashedpassword123' });
    
    expect(loginRes.status).toBe(200);
    
    // 3. Create a test restaurant
    const [rest] = await db
      .insert(db.restaurants)
      .values({
        name: 'Test Pizza Place',
        location: 'Toronto',
        category: 'Pizza',
        price_range: '$'
      })
      .returning();
    restaurantId = rest.id;
  });

  it('creates a new list', async () => {
    const res = await agent
      .post('/api/lists')
      .send({ 
        name: 'Best Pizza', 
        description: 'My fav pizzas', 
        visibility: 'public' 
      });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Best Pizza');
    listId = res.body.id;
  });

  it('fetches the newly created list', async () => {
    const res = await agent
      .get(`/api/lists/${listId}`);
    
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Best Pizza');
    expect(res.body.description).toBe('My fav pizzas');
    expect(res.body.visibility).toBe('public');
  });

  it('adds a restaurant to the list', async () => {
    const res = await agent
      .post(`/api/lists/${listId}/items`)
      .send({ 
        restaurantId, 
        rating: 5, 
        liked: 'Amazing cheese', 
        disliked: 'Nothing', 
        notes: 'Excellent pizza!' 
      });
    
    expect(res.status).toBe(200);
    expect(res.body.restaurantId).toBe(restaurantId);
    expect(res.body.listId).toBe(listId);
    expect(res.body.rating).toBe(5);
    expect(res.body.liked).toBe('Amazing cheese');
  });

  it('updates a list item', async () => {
    // First, get the list to find the item ID
    const listRes = await agent
      .get(`/api/lists/${listId}`);
    
    expect(listRes.body.items).toHaveLength(1);
    const itemId = listRes.body.items[0].id;
    
    // Update the item
    const updateRes = await agent
      .put(`/api/lists/${listId}/items/${itemId}`)
      .send({ 
        rating: 4, 
        liked: 'Good cheese', 
        disliked: 'A bit expensive', 
        notes: 'Still great pizza!' 
      });
    
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.rating).toBe(4);
    expect(updateRes.body.liked).toBe('Good cheese');
    expect(updateRes.body.disliked).toBe('A bit expensive');
  });

  it('updates list metadata', async () => {
    const res = await agent
      .put(`/api/lists/${listId}`)
      .send({ 
        name: 'Updated Pizza List', 
        description: 'My updated favorite pizzas', 
        visibility: 'circle' 
      });
    
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Pizza List');
    expect(res.body.description).toBe('My updated favorite pizzas');
    expect(res.body.visibility).toBe('circle');
  });

  it('deletes a list item', async () => {
    // Get the item ID
    const listRes = await agent
      .get(`/api/lists/${listId}`);
    
    const itemId = listRes.body.items[0].id;
    
    // Delete the item
    const delRes = await agent
      .delete(`/api/lists/${listId}/items/${itemId}`);
    
    expect(delRes.status).toBe(204);
    
    // Verify it's deleted
    const verifyRes = await agent
      .get(`/api/lists/${listId}`);
    
    expect(verifyRes.body.items).toHaveLength(0);
  });

  it('deletes the entire list', async () => {
    const res = await agent
      .delete(`/api/lists/${listId}`);
    
    expect(res.status).toBe(204);
    
    // Verify list is deleted
    const verifyRes = await agent
      .get(`/api/lists/${listId}`);
    
    expect(verifyRes.status).toBe(404);
  });

  afterAll(async () => {
    // Clean up: delete test data
    try {
      await db.delete(db.restaurantListItems).where(db.restaurantListItems.listId.eq(listId));
      await db.delete(db.restaurantLists).where(db.restaurantLists.id.eq(listId));
      await db.delete(db.restaurants).where(db.restaurants.id.eq(restaurantId));
      await db.delete(db.users).where(db.users.id.eq(userId));
    } catch (error) {
      console.log('Cleanup error (might be expected):', error);
    }
  });
});
