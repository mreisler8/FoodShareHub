/**
 * Feature Flag System for Controlled Rollout
 * Enables/disables features based on configuration and user criteria
 */

interface FeatureFlags {
  // Phase 1: Data Accessibility Features
  authenticatedHomeDashboard: boolean;
  realTimeDataFetching: boolean;
  improvedEmptyStates: boolean;
  
  // Phase 2: Enhanced UX Features (planned)
  unifiedCreateCanvas: boolean;
  socialActivityFeed: boolean;
  advancedSearch: boolean;
  
  // Phase 3: Advanced Features (planned)
  realTimeCollaboration: boolean;
  aiRecommendations: boolean;
  socialGameification: boolean;
}

// Default feature flag configuration
const defaultFlags: FeatureFlags = {
  // Phase 1: Enable data accessibility improvements (completed)
  authenticatedHomeDashboard: true,  // ✅ Authenticated users see lists instead of redirect
  realTimeDataFetching: true,       // ✅ Fresh API data with cache busting
  improvedEmptyStates: true,        // ✅ Helpful empty states with actions
  
  // Phase 2: Enhanced UX Features (disabled for now)
  unifiedCreateCanvas: false,
  socialActivityFeed: false,
  advancedSearch: false,
  
  // Phase 3: Advanced Features (disabled for now)
  realTimeCollaboration: false,
  aiRecommendations: false,
  socialGameification: false,
};

// Environment-based overrides
const environmentFlags: Record<string, Partial<FeatureFlags>> = {
  development: {
    // All Phase 1 features enabled in development
    authenticatedHomeDashboard: true,
    realTimeDataFetching: true,
    improvedEmptyStates: true,
    // Phase 2 experimental features
    unifiedCreateCanvas: true,
  },
  staging: {
    // Conservative rollout for staging
    authenticatedHomeDashboard: true,
    realTimeDataFetching: true,
    improvedEmptyStates: true,
  },
  production: {
    // Production-ready features only
    authenticatedHomeDashboard: true,
    realTimeDataFetching: true,
    improvedEmptyStates: true,
  }
};

// Get current environment
const getEnvironment = (): string => {
  return import.meta.env.NODE_ENV || 'development';
};

// User-based feature flag overrides (for A/B testing)
const getUserFlags = (userId?: number): Partial<FeatureFlags> => {
  if (!userId) return {};
  
  // Example: Enable experimental features for specific users
  const experimentalUsers = [7]; // User ID 7 (Mitch) gets experimental features
  
  if (experimentalUsers.includes(userId)) {
    return {
      unifiedCreateCanvas: true,
      socialActivityFeed: true,
    };
  }
  
  return {};
};

// Main feature flag resolver
export const getFeatureFlags = (userId?: number): FeatureFlags => {
  const environment = getEnvironment();
  const envFlags = environmentFlags[environment] || {};
  const userFlags = getUserFlags(userId);
  
  return {
    ...defaultFlags,
    ...envFlags,
    ...userFlags,
  };
};

// Hook for using feature flags in components
export const useFeatureFlag = (flag: keyof FeatureFlags, userId?: number): boolean => {
  const flags = getFeatureFlags(userId);
  return flags[flag];
};

// Log feature flag status for debugging
export const logFeatureFlagStatus = (userId?: number): void => {
  const flags = getFeatureFlags(userId);
  console.log('🚀 FEATURE FLAGS:', {
    environment: getEnvironment(),
    userId,
    enabledFlags: Object.entries(flags)
      .filter(([_, enabled]) => enabled)
      .map(([flag]) => flag),
    flags
  });
};