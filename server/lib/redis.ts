import { createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

class RedisManager {
  private client: RedisClientType | null = null;
  private connected: boolean = false;
  private hasLoggedError: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      });

      this.client.on('error', (err: Error) => {
        if (!this.hasLoggedError) {
          console.log(`Redis connection failed: ${err.message}. Caching disabled.`);
          this.hasLoggedError = true;
        }
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully');
        this.connected = true;
        this.hasLoggedError = false;
      });

      this.client.on('ready', () => {
        this.connected = true;
      });

      this.client.on('end', () => {
        this.connected = false;
      });

      // Attempt initial connection
      await this.client.connect();
    } catch (error) {
      if (!this.hasLoggedError) {
        console.log(`Redis initialization failed: ${(error as Error).message}. Caching disabled.`);
        this.hasLoggedError = true;
      }
      this.connected = false;
    }
  }

  get isEnabled(): boolean {
    return this.connected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isEnabled) return null;
    
    try {
      return await this.client!.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      if (ttlSeconds) {
        await this.client!.setEx(key, ttlSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.error('Error disconnecting Redis:', error);
      }
    }
  }
}

// Singleton instance
export const redis = new RedisManager();

// Export for testing
export type { RedisClientType };
export { RedisManager };