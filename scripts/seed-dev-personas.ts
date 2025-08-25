/**
 * Development Persona Seed Script
 * 
 * Creates test users and data for E2E validation of Lists MVP
 * Run with: npm run db:seed:personas
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { users, circles, lists, follows, circleMembers } from '../shared/schema';
import { migrationHelpers } from '../shared/schema-v2';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);
const db = drizzle(sql);

// Test persona data
const TEST_PERSONAS = {
  userA: {
    username: 'user-a',
    email: 'usera@test.com',
    name: 'Alice Owner',
    password: 'password123',
    role: 'Owner - creates lists, tests ownership permissions'
  },
  userB: {
    username: 'user-b', 
    email: 'userb@test.com',
    name: 'Bob Follower',
    password: 'password123',
    role: 'Follower - follows User A, tests follower access'
  },
  userC: {
    username: 'user-c',
    email: 'userc@test.com', 
    name: 'Carol Circle',
    password: 'password123',
    role: 'Circle Member - member of test circle, tests circle access'
  },
  userD: {
    username: 'user-d',
    email: 'userd@test.com',
    name: 'Dave Anonymous', 
    password: 'password123',
    role: 'No Relation - tests public-only access'
  }
} as const;

const TEST_CIRCLES = [
  {
    name: 'Food Lovers NYC',
    description: 'Best spots in New York City',
    slug: 'food-lovers-nyc'
  },
  {
    name: 'Coffee Aficionados',
    description: 'Third-wave coffee shops',
    slug: 'coffee-aficionados'  
  }
] as const;

const TEST_LISTS = [
  {
    name: 'Best Pizza in Brooklyn',
    description: 'My top pizza spots after living here 5 years',
    visibility: 'public',
    tags: ['pizza', 'brooklyn', 'italian']
  },
  {
    name: 'Private Date Night Spots',
    description: 'Secret romantic restaurants',
    visibility: 'private', 
    tags: ['date-night', 'romantic', 'upscale']
  },
  {
    name: 'Followers Only Brunch',
    description: 'Weekend brunch recommendations',
    visibility: 'followers',
    tags: ['brunch', 'weekend', 'eggs']
  },
  {
    name: 'Food Lovers Circle Recs',
    description: 'Shared with my food circle',
    visibility: 'circle',
    tags: ['circle-exclusive', 'hidden-gems']
  }
] as const;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function clearExistingData() {
  console.log('🧹 Cleaning existing test data...');
  
  // Delete in dependency order
  await db.delete(circleMembers).where(sql`username LIKE 'user-%'`);
  await db.delete(follows).where(sql`follower_id IN (SELECT id FROM users WHERE username LIKE 'user-%')`);
  await db.delete(lists).where(sql`created_by_id IN (SELECT id FROM users WHERE username LIKE 'user-%')`);
  await db.delete(circles).where(sql`slug LIKE '%-test' OR slug IN ('food-lovers-nyc', 'coffee-aficionados')`);
  await db.delete(users).where(sql`username LIKE 'user-%'`);
  
  console.log('✅ Existing test data cleared');
}

async function createTestUsers() {
  console.log('👥 Creating test personas...');
  
  const createdUsers: Record<string, any> = {};
  
  for (const [key, persona] of Object.entries(TEST_PERSONAS)) {
    const hashedPassword = await hashPassword(persona.password);
    
    const [user] = await db.insert(users).values({
      username: persona.username,
      email: persona.email,
      name: persona.name,
      passwordHash: hashedPassword,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    createdUsers[key] = user;
    console.log(`✅ Created ${persona.name} (${persona.username})`);
  }
  
  return createdUsers;
}

async function createTestCircles(users: Record<string, any>) {
  console.log('⭕ Creating test circles...');
  
  const createdCircles: any[] = [];
  
  for (const circleData of TEST_CIRCLES) {
    const [circle] = await db.insert(circles).values({
      name: circleData.name,
      description: circleData.description,
      slug: circleData.slug,
      createdById: users.userA.id, // Alice creates all circles
      isPublic: true,
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    createdCircles.push(circle);
    console.log(`✅ Created circle: ${circle.name}`);
  }
  
  return createdCircles;
}

async function createRelationships(users: Record<string, any>, circles: any[]) {
  console.log('🔗 Creating relationships...');
  
  // User B follows User A
  await db.insert(follows).values({
    followerId: users.userB.id,
    followingId: users.userA.id,
    createdAt: new Date()
  });
  console.log('✅ User B now follows User A');
  
  // User C joins Food Lovers NYC circle
  const foodCircle = circles.find(c => c.slug === 'food-lovers-nyc');
  if (foodCircle) {
    await db.insert(circleMembers).values({
      circleId: foodCircle.id,
      userId: users.userC.id,
      role: 'member',
      joinedAt: new Date()
    });
    console.log('✅ User C joined Food Lovers NYC circle');
  }
  
  // User A is creator/admin of both circles
  for (const circle of circles) {
    await db.insert(circleMembers).values({
      circleId: circle.id,
      userId: users.userA.id,
      role: 'admin',
      joinedAt: new Date()
    });
  }
  console.log('✅ User A is admin of all circles');
}

async function createTestLists(users: Record<string, any>, circles: any[]) {
  console.log('📋 Creating test lists...');
  
  const foodCircle = circles.find(c => c.slug === 'food-lovers-nyc');
  
  for (const listData of TEST_LISTS) {
    const { visibility, visibilityCircleIds } = migrationHelpers.legacyToV2Visibility({
      visibility: listData.visibility,
      circleId: listData.visibility === 'circle' ? foodCircle?.id : undefined
    });
    
    const [list] = await db.insert(lists).values({
      name: listData.name,
      description: listData.description,
      createdById: users.userA.id, // Alice creates all lists
      
      // V2 visibility system
      visibilityV2: visibility,
      visibilityCircleIds: visibilityCircleIds,
      migratedToV2: true,
      migrationTimestamp: new Date(),
      
      // Legacy fields for backward compatibility
      makePublic: visibility === 'public',
      shareWithCircle: visibility === 'circle',
      isPublic: visibility === 'public',
      
      tags: listData.tags,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`✅ Created list: ${list.name} (${visibility})`);
  }
}

async function validateSetup(users: Record<string, any>) {
  console.log('🔍 Validating setup...');
  
  // Check users exist
  const userCount = await db.select().from(users).where(sql`username LIKE 'user-%'`);
  console.log(`✅ Created ${userCount.length} test users`);
  
  // Check relationships
  const followCount = await db.select().from(follows).where(sql`follower_id = ${users.userB.id}`);
  console.log(`✅ User B follows ${followCount.length} user(s)`);
  
  // Check lists with V2 visibility
  const listsWithV2 = await db.select().from(lists).where(sql`migrated_to_v2 = true`);
  console.log(`✅ Created ${listsWithV2.length} lists with V2 visibility`);
  
  // Check circles
  const circleCount = await db.select().from(circles).where(sql`slug LIKE '%test' OR slug IN ('food-lovers-nyc', 'coffee-aficionados')`);
  console.log(`✅ Created ${circleCount.length} test circles`);
}

async function printCredentials() {
  console.log('\n🔑 Test Credentials for E2E Validation:');
  console.log('=====================================');
  
  for (const [key, persona] of Object.entries(TEST_PERSONAS)) {
    console.log(`\n${persona.name} (${key.toUpperCase()}):`);
    console.log(`  Username: ${persona.username}`);
    console.log(`  Email: ${persona.email}`);
    console.log(`  Password: ${persona.password}`);
    console.log(`  Role: ${persona.role}`);
  }
  
  console.log('\n📋 Test Data Created:');
  console.log('====================');
  console.log('• 4 test lists with different visibility levels');
  console.log('• 2 test circles with memberships');
  console.log('• Follow relationship: User B → User A');
  console.log('• Circle membership: User C → Food Lovers NYC');
  console.log('• All lists use V2 visibility system');
  
  console.log('\n🧪 E2E Testing Flow:');
  console.log('====================');
  console.log('1. Login as User A → Create/edit lists, test ownership');
  console.log('2. Login as User B → See public + followers lists, test save/unsave');
  console.log('3. Login as User C → See public + circle lists, test circle access');
  console.log('4. Login as User D → See public lists only, test access restrictions');
  console.log('5. Test persistence: refresh pages, verify state consistency');
}

export async function seedDevPersonas() {
  try {
    console.log('🚀 Starting development persona seed...');
    
    if (!process.env.DEV_TEST_PERSONAS) {
      console.log('⚠️  DEV_TEST_PERSONAS flag not set, skipping seed');
      return;
    }
    
    await clearExistingData();
    const users = await createTestUsers();
    const circles = await createTestCircles(users);
    await createRelationships(users, circles);
    await createTestLists(users, circles);
    await validateSetup(users);
    await printCredentials();
    
    console.log('\n✅ Development persona seed completed successfully!');
    console.log('🔗 Ready for E2E testing at: http://localhost:5000');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedDevPersonas().catch(console.error);
}