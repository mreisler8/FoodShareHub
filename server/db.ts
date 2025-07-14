import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with stable PostgreSQL connection
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// Test database connection and provide fallback
let isDbConnected = false;
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    isDbConnected = false;
  } else {
    console.log('Database connection successful');
    isDbConnected = true;
  }
});

export const isDatabaseConnected = () => isDbConnected;