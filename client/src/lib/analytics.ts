import Plausible from 'plausible-tracker';
import { apiRequest } from './queryClient';

// Initialize Plausible - for privacy focused analytics
// Note: You will need to set up a Plausible account and domain for production
const { trackPageview, trackEvent } = Plausible({
  domain: 'circles.app',
  apiHost: import.meta.env.VITE_PLAUSIBLE_API_HOST || 'https://plausible.io',
  trackLocalhost: true
});

// Initialize server-side analytics tracking
export const trackAction = async (
  userId: number | undefined,
  action: string,
  metadata: Record<string, any> = {}
) => {
  if (!userId) return;
  
  try {
    // Track in our own database
    await apiRequest('POST', '/api/analytics/track', {
      userId,
      action,
      metadata
    });
    
    // Also track in Plausible for aggregated analytics
    trackEvent(action, { props: metadata });
  } catch (error) {
    console.error('Failed to track action:', error);
  }
};

// Common tracking events
export const analytics = {
  trackPageView: (userId?: number, pageName?: string) => {
    trackPageview();
    if (userId) {
      trackAction(userId, 'page_view', { page: pageName || window.location.pathname });
    }
  },
  
  trackRestaurantView: (userId: number | undefined, restaurantId: number, restaurantName: string) => {
    trackAction(userId, 'view_restaurant', { 
      restaurantId,
      restaurantName
    });
  },
  
  trackPostView: (userId: number | undefined, postId: number, authorId: number) => {
    trackAction(userId, 'view_post', { 
      postId,
      authorId
    });
  },
  
  trackProfileView: (userId: number | undefined, profileId: number) => {
    trackAction(userId, 'view_profile', { 
      profileId 
    });
  },
  
  trackSearch: (userId: number | undefined, query: string, resultCount: number) => {
    trackAction(userId, 'search', { 
      query,
      resultCount
    });
  },
  
  trackCircleJoin: (userId: number, circleId: number, circleName: string) => {
    trackAction(userId, 'join_circle', { 
      circleId,
      circleName 
    });
  },
  
  trackSocialShare: (userId: number | undefined, contentId: number, platform: string) => {
    trackAction(userId, 'social_share', { 
      contentId,
      platform
    });
  },
  
  trackListCreate: (userId: number, listId: number, listName: string) => {
    trackAction(userId, 'create_list', { 
      listId,
      listName 
    });
  },
  
  trackInvite: (userId: number | undefined, inviteType: string, method: string, circleId?: number) => {
    trackAction(userId, 'send_invite', {
      inviteType,
      method, 
      ...(circleId && { circleId })
    });
  }
};

export default analytics;