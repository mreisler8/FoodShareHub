// Restaurant Identity System Feature Flags
// Set true by default for production deployment
export const FEATURE_FLAGS = {
  STRICT_IDENTITY: true,
  STRICT_RATING_BINDING: true, 
  DISABLE_RATING_FALLBACK: true,
  STRICT_CACHE_KEYS: true,
  CIRCLE_SCORE_UNIFIED: true,
  PLACES_TIMEOUTS: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}