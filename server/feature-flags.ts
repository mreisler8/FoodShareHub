// Feature flags for Lists MVP systemic fix
export const FEATURE_FLAGS = {
  LISTS_VISIBILITY_V2: process.env.LISTS_VISIBILITY_V2 === 'true' || process.env.NODE_ENV === 'development',
  LISTS_SAVE_STATUS_V1: process.env.LISTS_SAVE_STATUS_V1 === 'true' || process.env.NODE_ENV === 'development', 
  DEV_TEST_PERSONAS: process.env.DEV_TEST_PERSONAS === 'true' || process.env.NODE_ENV === 'development',
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

// Log feature flag status on startup
console.log('Feature Flags:', FEATURE_FLAGS);