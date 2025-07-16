import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { PostType } from './PostTypeSelector';

interface PostTypeAnalyticsProps {
  eventType: 'view' | 'select' | 'create';
  postType?: PostType;
  metadata?: Record<string, any>;
}

export function PostTypeAnalytics({ eventType, postType, metadata }: PostTypeAnalyticsProps) {
  useEffect(() => {
    const trackEvent = async () => {
      try {
        await apiRequest('/api/analytics/track', {
          method: 'POST',
          body: JSON.stringify({
            event: `post_type_${eventType}`,
            data: {
              postType,
              timestamp: new Date().toISOString(),
              ...metadata
            }
          })
        });
      } catch (error) {
        // Silently fail analytics tracking
        console.debug('Analytics tracking failed:', error);
      }
    };

    trackEvent();
  }, [eventType, postType, metadata]);

  return null; // This component doesn't render anything
}