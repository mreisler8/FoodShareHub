/**
 * Dev Test Personas Seed Script
 * 
 * Creates test users and data for validating Lists MVP functionality:
 * - User A (owner/creator) 
 * - User B (follower of A, member of Circle C1)
 * - Circle C1 (A + B members)
 * - Circle C2 (A only)
 * - Sample lists with different visibility settings
 * 
 * Run with: tsx scripts/seed-dev-personas.ts
 */

import { db } from '../server/db';
import { users, circles, circleMembers, userFollowers, restaurantLists, restaurants, restaurantListItems, savedLists } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { isFeatureEnabled } from '../server/feature-flags';

interface TestUser {
  id: number;
  username: string;
  name: string;
}

interface TestCircle {
  id: number;
  name: string;
}

async function createDevPersonas() {
  if (!isFeatureEnabled('DEV_TEST_PERSONAS')) {
    console.log('❌ DEV_TEST_PERSONAS feature flag is disabled');
    console.log('💡 Enable with: export DEV_TEST_PERSONAS=true');
    return;
  }

  console.log('🎭 Creating dev test personas for Lists MVP...');

  try {
    // Create test users
    console.log('👥 Creating test users...');
    
    const testUsers: TestUser[] = [];
    
    // User A (Owner/Creator)
    const [userA] = await db.insert(users).values({
      username: 'userA_creator',
      password: 'test123', // In real implementation, this would be hashed
      name: 'Alice Creator',
      bio: 'Food enthusiast and list creator',
      preferredCuisines: ['Italian', 'Japanese'],
      preferredPriceRange: '$$',
      favoriteFood: 'Margherita Pizza',
      favoriteRestaurant: 'Joe\'s Pizza',
    }).returning().onConflictDoNothing();

    if (userA) testUsers.push(userA);

    // User B (Follower)
    const [userB] = await db.insert(users).values({
      username: 'userB_follower',
      password: 'test123',
      name: 'Bob Follower',
      bio: 'Loves discovering new restaurants',
      preferredCuisines: ['Mexican', 'Italian'],
      preferredPriceRange: '$',
      favoriteFood: 'Tacos',
      favoriteRestaurant: 'Taco Bell',
    }).returning().onConflictDoNothing();

    if (userB) testUsers.push(userB);

    console.log(`✅ Created ${testUsers.length} test users`);

    if (testUsers.length < 2) {
      console.log('⚠️  Some users may already exist, continuing with existing users...');
      
      // Fetch existing users
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.username, 'userA_creator'))
        .limit(1);
      
      if (existingUsers.length > 0) {
        const existingUserB = await db
          .select()
          .from(users)
          .where(eq(users.username, 'userB_follower'))
          .limit(1);
        
        testUsers.push(existingUsers[0]);
        if (existingUserB.length > 0) {
          testUsers.push(existingUserB[0]);
        }
      }
    }

    const [userA_final, userB_final] = testUsers;

    // Create test circles
    console.log('⭕ Creating test circles...');
    
    const [circleC1] = await db.insert(circles).values({
      name: 'NYC Food Lovers',
      description: 'The best spots in New York City',
      creatorId: userA_final.id,
      isPrivate: false,
      primaryCuisine: 'Italian',
      priceRange: '$$',
      location: 'New York',
    }).returning().onConflictDoNothing();

    const [circleC2] = await db.insert(circles).values({
      name: 'Alice\'s Private Circle',
      description: 'Alice\'s personal food discoveries',
      creatorId: userA_final.id,
      isPrivate: true,
      primaryCuisine: 'Japanese',
      priceRange: '$$$',
      location: 'New York',
    }).returning().onConflictDoNothing();

    console.log('✅ Created test circles');

    // Create circle memberships
    console.log('👫 Setting up circle memberships...');
    
    if (circleC1) {
      // Both users in C1
      await db.insert(circleMembers).values([
        {
          circleId: circleC1.id,
          userId: userA_final.id,
          role: 'owner',
          status: 'active',
        },
        {
          circleId: circleC1.id,
          userId: userB_final.id,
          role: 'member',
          status: 'active',
        }
      ]).onConflictDoNothing();
    }

    if (circleC2) {
      // Only User A in C2
      await db.insert(circleMembers).values({
        circleId: circleC2.id,
        userId: userA_final.id,
        role: 'owner',
        status: 'active',
      }).onConflictDoNothing();
    }

    // Create follow relationship (B follows A)
    await db.insert(userFollowers).values({
      followerId: userB_final.id,
      followingId: userA_final.id,
      status: 'following',
    }).onConflictDoNothing();

    console.log('✅ Set up relationships');

    // Create sample restaurants
    console.log('🍕 Creating sample restaurants...');
    
    const sampleRestaurants = await db.insert(restaurants).values([
      {
        name: 'Joe\'s Pizza',
        location: 'New York',
        category: 'Pizza',
        priceRange: '$',
        cuisine: 'Italian',
        city: 'New York',
        address: '123 Broadway, New York, NY',
      },
      {
        name: 'Momofuku Noodle Bar',
        location: 'New York',
        category: 'Ramen',
        priceRange: '$$',
        cuisine: 'Japanese',
        city: 'New York',
        address: '456 E Village, New York, NY',
      },
      {
        name: 'The French Laundry',
        location: 'Napa Valley',
        category: 'Fine Dining',
        priceRange: '$$$$',
        cuisine: 'French',
        city: 'Yountville',
        address: '6640 Washington St, Yountville, CA',
      },
    ]).returning().onConflictDoNothing();

    console.log(`✅ Created ${sampleRestaurants.length} sample restaurants`);

    // Create test lists with different visibility settings
    console.log('📝 Creating test lists...');
    
    const testLists: any[] = [];

    // List 1: Public
    const [publicList] = await db.insert(restaurantLists).values({
      name: 'Best Pizza in NYC',
      description: 'My favorite pizza spots around the city',
      createdById: userA_final.id,
      visibilityV2: 'public',
      visibilityCircleIds: null,
      tags: ['pizza', 'nyc', 'casual'],
      type: 'restaurant',
      // Legacy fields for compatibility
      isPublic: true,
      makePublic: true,
      shareWithCircle: false,
      visibility: 'public',
    }).returning().onConflictDoNothing();

    if (publicList) testLists.push(publicList);

    // List 2: Circle only (C1)
    const [circleList] = await db.insert(restaurantLists).values({
      name: 'NYC Group Favorites',
      description: 'Places our food group loves',
      createdById: userA_final.id,
      visibilityV2: 'circle',
      visibilityCircleIds: circleC1 ? [circleC1.id] : null,
      tags: ['group', 'favorites'],
      type: 'restaurant',
      // Legacy fields
      isPublic: false,
      makePublic: false,
      shareWithCircle: true,
      circleId: circleC1?.id,
      visibility: 'circle',
    }).returning().onConflictDoNothing();

    if (circleList) testLists.push(circleList);

    // List 3: Followers only
    const [followersOnlyList] = await db.insert(restaurantLists).values({
      name: 'Hidden Gems',
      description: 'Special places only for my followers',
      createdById: userA_final.id,
      visibilityV2: 'followers',
      visibilityCircleIds: null,
      tags: ['hidden', 'gems'],
      type: 'restaurant',
      // Legacy fields
      isPublic: false,
      makePublic: false,
      shareWithCircle: false,
      visibility: 'followers',
    }).returning().onConflictDoNothing();

    if (followersOnlyList) testLists.push(followersOnlyList);

    // List 4: Private
    const [privateList] = await db.insert(restaurantLists).values({
      name: 'My Personal Bucket List',
      description: 'Places I want to try someday',
      createdById: userA_final.id,
      visibilityV2: 'private',
      visibilityCircleIds: null,
      tags: ['bucket-list', 'personal'],
      type: 'restaurant',
      // Legacy fields
      isPublic: false,
      makePublic: false,
      shareWithCircle: false,
      visibility: 'private',
    }).returning().onConflictDoNothing();

    if (privateList) testLists.push(privateList);

    console.log(`✅ Created ${testLists.length} test lists`);

    // Add restaurants to lists
    console.log('🔗 Adding restaurants to lists...');
    
    if (testLists.length > 0 && sampleRestaurants.length > 0) {
      const listItems: any[] = [];
      
      for (let i = 0; i < testLists.length; i++) {
        const list = testLists[i];
        const restaurant = sampleRestaurants[i % sampleRestaurants.length];
        
        if (list?.id && restaurant?.id) {
          listItems.push({
            listId: list.id,
            restaurantId: restaurant.id,
            addedById: userA_final.id,
            position: 1,
            rating: 4 + (i % 2), // 4 or 5 stars
            notes: `Great ${restaurant.cuisine} spot!`,
            mustTryDishes: [`${restaurant.cuisine} specialty`],
          });
        }
      }

      if (listItems.length > 0) {
        await db.insert(restaurantListItems).values(listItems).onConflictDoNothing();
      }
    }

    // Create some saved lists for User B
    console.log('💾 Creating saved lists...');
    
    if (testLists.length > 0) {
      // User B saves the public list and circle list (if they have access)
      const listsToSave = testLists.filter((list: any) => 
        list?.visibilityV2 === 'public' || 
        (list?.visibilityV2 === 'circle' && circleC1) ||
        list?.visibilityV2 === 'followers'
      );

      if (listsToSave.length > 0) {
        const savedListsData = listsToSave.map((list: any) => ({
          listId: list.id,
          userId: userB_final.id,
        }));

        await db.insert(savedLists).values(savedListsData).onConflictDoNothing();
      }
    }

    // Summary
    console.log('\n🎉 Dev personas created successfully!');
    console.log('\n📊 Summary:');
    console.log(`👤 User A (Creator): ${userA_final.username} (ID: ${userA_final.id})`);
    console.log(`👤 User B (Follower): ${userB_final.username} (ID: ${userB_final.id})`);
    console.log(`⭕ Circle C1: ${circleC1?.name} (ID: ${circleC1?.id}) - Both users`);
    console.log(`⭕ Circle C2: ${circleC2?.name} (ID: ${circleC2?.id}) - User A only`);
    console.log(`📝 Created ${testLists.length} lists with different visibility levels`);
    console.log(`🍕 Created ${sampleRestaurants.length} sample restaurants`);
    
    console.log('\n🧪 Test scenarios you can now validate:');
    console.log('1. User A can see all their lists');
    console.log('2. User B can see public lists and circle lists (if member)');
    console.log('3. User B cannot see private lists or lists in circles they\'re not in');
    console.log('4. Save/unsave functionality works correctly');
    console.log('5. Different visibility settings work as expected');
    
  } catch (error) {
    console.error('💥 Error creating dev personas:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createDevPersonas()
    .then(() => {
      console.log('\n✅ Dev personas setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create dev personas:', error);
      process.exit(1);
    });
}

export { createDevPersonas };