export const features = {
  STRICT_IDENTITY: true,
  FILTER_TEST_DATA: true,
  UNIFIED_CIRCLE_SCORE: true,
  STRICT_CACHE_KEYS: true,
  RATING_FALLBACK_DISABLED: true, // disable showing ratings fetched by placeId directly
  REDIS_ENABLED: process.env.REDIS_URL ? true : false,
} as const;