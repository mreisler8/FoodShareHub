
import request from 'supertest';
import { db } from '../server/db.js';
import app from '../server/index.js';

describe('List & Recommendation API Flow', () => {
  let token: string;
  let listId: number;
  let restaurantId: number;

  beforeAll(async () => {
    // 1. Create a test user directly in the DB
    const [user] = await db
      .insert(users)
      .values({ username: 'e2e_test', password: 'test', name: 'E2E Tester' })
      .returning();
    
    // 2. Log in via the auth endpoint to get a token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'e2e_test', password: 'test' });
    token = res.body.token;
    
    // 3. Create a test restaurant
    const [rest] = await db
      .insert(restaurants)
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
    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Best Pizza', description: 'My fav pizzas', visibility: 'public' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    listId = res.body.id;
  });

  it('fetches the newly created list', async () => {
    const res = await request(app)
      .get(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Best Pizza');
  });

  it('adds a restaurant to the list', async () => {
    const res = await request(app)
      .post(`/api/lists/${listId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurantId, rating: 5, liked: 'Cheese', disliked: '', notes: 'Excellent!' });
    expect(res.status).toBe(201);
    expect(res.body.restaurantId).toBe(restaurantId);
    expect(res.body.listId).toBe(listId);
  });

  it('deletes the recommendation item', async () => {
    // first, list all items to get the itemId
    const listRes = await request(app)
      .get(`/api/lists/${listId}`)
      .set('Authorization', `Bearer ${token}`);
    const itemId = listRes.body.items[0].id;
    const delRes = await request(app)
      .delete(`/api/lists/${listId}/items/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);
  });

  afterAll(async () => {
    // clean up: delete test data
    await db.delete(restaurantListItems).where(eq(restaurantListItems.listId, listId));
    await db.delete(restaurantLists).where(eq(restaurantLists.id, listId));
    await db.delete(restaurants).where(eq(restaurants.id, restaurantId));
    await db.delete(users).where(eq(users.username, 'e2e_test'));
  });
});
