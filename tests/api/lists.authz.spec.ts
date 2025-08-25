/**
 * Lists Authorization Matrix Tests
 * 
 * Tests persona-level authorization across all list endpoints
 * with different visibility settings.
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../../server/index';
import { db } from '../../server/db';
import { users, circles, circleMembers, userFollowers, restaurantLists, restaurants, restaurantListItems } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Lists Authorization Matrix', () => {
  let testData: {
    userA: { id: number; cookie: string }; // Owner
    userB: { id: number; cookie: string }; // Follower of A
    userC: { id: number; cookie: string }; // Non-follower
    userD: { id: number; cookie: string }; // Circle member
    circleC1: { id: number };
    restaurant: { id: number };
    lists: {
      public: { id: number };
      private: { id: number };
      followers: { id: number };
      circle: { id: number };
    };
  };

  beforeAll(async () => {
    // Create test personas
    const [userA] = await db.insert(users).values({
      username: 'test_owner_' + Date.now(),
      password: 'test123',
      name: 'Test Owner',
    }).returning();

    const [userB] = await db.insert(users).values({
      username: 'test_follower_' + Date.now(),
      password: 'test123',
      name: 'Test Follower',
    }).returning();

    const [userC] = await db.insert(users).values({
      username: 'test_nonfollower_' + Date.now(),
      password: 'test123',
      name: 'Test Non-Follower',
    }).returning();

    const [userD] = await db.insert(users).values({
      username: 'test_circlemember_' + Date.now(),
      password: 'test123',
      name: 'Test Circle Member',
    }).returning();

    // Create circle
    const [circleC1] = await db.insert(circles).values({
      name: 'Test Circle',
      description: 'Test circle for authz',
      creatorId: userA.id,
      isPrivate: false,
    }).returning();

    // Setup relationships
    await db.insert(userFollowers).values({
      followerId: userB.id,
      followingId: userA.id,
      status: 'following',
    });

    await db.insert(circleMembers).values([
      {
        circleId: circleC1.id,
        userId: userA.id,
        role: 'owner',
        status: 'active',
      },
      {
        circleId: circleC1.id,
        userId: userD.id,
        role: 'member',
        status: 'active',
      }
    ]);

    // Create test restaurant
    const [restaurant] = await db.insert(restaurants).values({
      name: 'Test Restaurant',
      location: 'Test Location',
      category: 'Test',
      priceRange: '$$',
      cuisine: 'Test',
    }).returning();

    // Create lists with different visibility
    const [publicList] = await db.insert(restaurantLists).values({
      name: 'Public List',
      description: 'Public test list',
      createdById: userA.id,
      visibilityV2: 'public',
      isPublic: true,
      makePublic: true,
    }).returning();

    const [privateList] = await db.insert(restaurantLists).values({
      name: 'Private List',
      description: 'Private test list',
      createdById: userA.id,
      visibilityV2: 'private',
      isPublic: false,
      makePublic: false,
    }).returning();

    const [followersList] = await db.insert(restaurantLists).values({
      name: 'Followers List',
      description: 'Followers-only test list',
      createdById: userA.id,
      visibilityV2: 'followers',
      isPublic: false,
      makePublic: false,
    }).returning();

    const [circleList] = await db.insert(restaurantLists).values({
      name: 'Circle List',
      description: 'Circle-only test list',
      createdById: userA.id,
      visibilityV2: 'circle',
      visibilityCircleIds: [circleC1.id],
      isPublic: false,
      makePublic: false,
      shareWithCircle: true,
      circleId: circleC1.id,
    }).returning();

    // Add items to lists
    await db.insert(restaurantListItems).values([
      {
        listId: publicList.id,
        restaurantId: restaurant.id,
        addedById: userA.id,
        position: 1,
      },
      {
        listId: privateList.id,
        restaurantId: restaurant.id,
        addedById: userA.id,
        position: 1,
      },
      {
        listId: followersList.id,
        restaurantId: restaurant.id,
        addedById: userA.id,
        position: 1,
      },
      {
        listId: circleList.id,
        restaurantId: restaurant.id,
        addedById: userA.id,
        position: 1,
      },
    ]);

    // Mock session cookies (in real tests, would use proper auth)
    testData = {
      userA: { id: userA.id, cookie: `connect.sid=userA_${userA.id}` },
      userB: { id: userB.id, cookie: `connect.sid=userB_${userB.id}` },
      userC: { id: userC.id, cookie: `connect.sid=userC_${userC.id}` },
      userD: { id: userD.id, cookie: `connect.sid=userD_${userD.id}` },
      circleC1: { id: circleC1.id },
      restaurant: { id: restaurant.id },
      lists: {
        public: { id: publicList.id },
        private: { id: privateList.id },
        followers: { id: followersList.id },
        circle: { id: circleList.id },
      },
    };
  });

  afterAll(async () => {
    // Cleanup test data
    if (testData) {
      await db.delete(restaurantListItems).where(eq(restaurantListItems.restaurantId, testData.restaurant.id));
      await db.delete(restaurantLists).where(eq(restaurantLists.createdById, testData.userA.id));
      await db.delete(restaurants).where(eq(restaurants.id, testData.restaurant.id));
      await db.delete(circleMembers).where(eq(circleMembers.circleId, testData.circleC1.id));
      await db.delete(circles).where(eq(circles.id, testData.circleC1.id));
      await db.delete(userFollowers).where(eq(userFollowers.followerId, testData.userB.id));
      await db.delete(users).where(eq(users.id, testData.userA.id));
      await db.delete(users).where(eq(users.id, testData.userB.id));
      await db.delete(users).where(eq(users.id, testData.userC.id));
      await db.delete(users).where(eq(users.id, testData.userD.id));
    }
  });

  describe('GET /api/lists/:id - List Details', () => {
    it('allows owner to access all lists', async () => {
      for (const [visibility, list] of Object.entries(testData.lists)) {
        const response = await request(app)
          .get(`/api/lists/${list.id}`)
          .set('Cookie', testData.userA.cookie);
        
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(list.id);
      }
    });

    it('allows public access to public lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.public.id}`)
        .set('Cookie', testData.userB.cookie);
      
      expect(response.status).toBe(200);
    });

    it('allows followers to access followers-only lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.followers.id}`)
        .set('Cookie', testData.userB.cookie);
      
      expect(response.status).toBe(200);
    });

    it('denies non-followers access to followers-only lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.followers.id}`)
        .set('Cookie', testData.userC.cookie);
      
      expect(response.status).toBe(404);
    });

    it('allows circle members to access circle lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.circle.id}`)
        .set('Cookie', testData.userD.cookie);
      
      expect(response.status).toBe(200);
    });

    it('denies non-circle members access to circle lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.circle.id}`)
        .set('Cookie', testData.userC.cookie);
      
      expect(response.status).toBe(404);
    });

    it('denies all access to private lists except owner', async () => {
      for (const persona of [testData.userB, testData.userC, testData.userD]) {
        const response = await request(app)
          .get(`/api/lists/${testData.lists.private.id}`)
          .set('Cookie', persona.cookie);
        
        expect(response.status).toBe(404);
      }
    });

    it('denies anonymous access to non-public lists', async () => {
      for (const [visibility, list] of Object.entries(testData.lists)) {
        if (visibility === 'public') continue;
        
        const response = await request(app)
          .get(`/api/lists/${list.id}`);
        
        expect(response.status).toBe(401);
      }
    });
  });

  describe('GET /api/lists/:id/save-status - Save Status', () => {
    it('requires authentication', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.public.id}/save-status`);
      
      expect(response.status).toBe(401);
    });

    it('allows checking save status for accessible lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.public.id}/save-status`)
        .set('Cookie', testData.userB.cookie);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('saved');
      expect(typeof response.body.saved).toBe('boolean');
    });

    it('denies save status for inaccessible lists', async () => {
      const response = await request(app)
        .get(`/api/lists/${testData.lists.private.id}/save-status`)
        .set('Cookie', testData.userC.cookie);
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST/DELETE /api/lists/:id/save - Save/Unsave', () => {
    it('allows saving accessible lists', async () => {
      const saveResponse = await request(app)
        .post(`/api/lists/${testData.lists.public.id}/save`)
        .set('Cookie', testData.userB.cookie);
      
      expect(saveResponse.status).toBe(200);
      expect(saveResponse.body.saved).toBe(true);

      // Test unsave
      const unsaveResponse = await request(app)
        .delete(`/api/lists/${testData.lists.public.id}/save`)
        .set('Cookie', testData.userB.cookie);
      
      expect(unsaveResponse.status).toBe(200);
      expect(unsaveResponse.body.saved).toBe(false);
    });

    it('denies saving inaccessible lists', async () => {
      const response = await request(app)
        .post(`/api/lists/${testData.lists.private.id}/save`)
        .set('Cookie', testData.userC.cookie);
      
      expect(response.status).toBe(404);
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .post(`/api/lists/${testData.lists.public.id}/save`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/lists/:id/items - Add Items', () => {
    it('allows owner to add items', async () => {
      const response = await request(app)
        .post(`/api/lists/${testData.lists.public.id}/items`)
        .set('Cookie', testData.userA.cookie)
        .send({
          restaurantId: testData.restaurant.id,
          rating: 4.5,
          notes: 'Great place!',
        });
      
      expect(response.status).toBe(200); // Should be 200 if item already exists (idempotent)
    });

    it('denies non-owners from adding items', async () => {
      const response = await request(app)
        .post(`/api/lists/${testData.lists.public.id}/items`)
        .set('Cookie', testData.userB.cookie)
        .send({
          restaurantId: testData.restaurant.id,
          rating: 4.5,
        });
      
      expect(response.status).toBe(403);
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .post(`/api/lists/${testData.lists.public.id}/items`)
        .send({
          restaurantId: testData.restaurant.id,
        });
      
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/lists/:id/items/reorder - Reorder Items', () => {
    it('allows owner to reorder items', async () => {
      // First get the list items to know their IDs
      const listResponse = await request(app)
        .get(`/api/lists/${testData.lists.public.id}/items`)
        .set('Cookie', testData.userA.cookie);
      
      if (listResponse.status === 200 && listResponse.body.items?.length > 0) {
        const itemIds = listResponse.body.items.map((item: any) => item.id);
        
        const response = await request(app)
          .put(`/api/lists/${testData.lists.public.id}/items/reorder`)
          .set('Cookie', testData.userA.cookie)
          .send({ itemIds });
        
        expect(response.status).toBe(200);
      }
    });

    it('denies non-owners from reordering items', async () => {
      const response = await request(app)
        .put(`/api/lists/${testData.lists.public.id}/items/reorder`)
        .set('Cookie', testData.userB.cookie)
        .send({ itemIds: [1, 2, 3] });
      
      expect(response.status).toBe(403);
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .put(`/api/lists/${testData.lists.public.id}/items/reorder`)
        .send({ itemIds: [1, 2, 3] });
      
      expect(response.status).toBe(401);
    });
  });
});