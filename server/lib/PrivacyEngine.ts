import { User } from "@shared/schema";

export type VisibilityLevel = 'public' | 'circle' | 'followers' | 'private';
export type ContentType = 'list' | 'post' | 'moment' | 'rating';

export interface PrivacyContext {
  contentType: ContentType;
  userId: string;
  circleIds?: number[];
  hasFollowers?: boolean;
  isFirstTimeUser?: boolean;
}

export interface PrivacySuggestion {
  level: VisibilityLevel;
  reasoning: string;
  audience: string;
  icon: string;
}

/**
 * Unified Privacy Engine for consistent visibility decisions across all content types
 */
export class PrivacyEngine {
  
  /**
   * Get smart privacy suggestions based on content type and user context
   */
  static getSuggestions(context: PrivacyContext): PrivacySuggestion[] {
    const suggestions: PrivacySuggestion[] = [];

    // Circle sharing (recommended for food content)
    if (context.circleIds && context.circleIds.length > 0) {
      suggestions.push({
        level: 'circle',
        reasoning: 'Share with your food circles for trusted recommendations',
        audience: `${context.circleIds.length} circle${context.circleIds.length > 1 ? 's' : ''}`,
        icon: 'users'
      });
    }

    // Followers (good for broader sharing)
    if (context.hasFollowers) {
      suggestions.push({
        level: 'followers',
        reasoning: 'Share with your followers who trust your taste',
        audience: 'Your followers',
        icon: 'user-plus'
      });
    }

    // Public (for discoverable content)
    suggestions.push({
      level: 'public',
      reasoning: 'Help the community discover great food',
      audience: 'Everyone on Circles',
      icon: 'globe'
    });

    // Private (always available)
    suggestions.push({
      level: 'private',
      reasoning: 'Keep this to yourself for now',
      audience: 'Only you',
      icon: 'lock'
    });

    return suggestions;
  }

  /**
   * Get the recommended default privacy level for content type
   */
  static getDefaultPrivacy(context: PrivacyContext): VisibilityLevel {
    // Food-focused content defaults to circle sharing
    if (context.contentType === 'list' || context.contentType === 'moment') {
      return context.circleIds && context.circleIds.length > 0 ? 'circle' : 'followers';
    }

    // Ratings default to circle for trust-building
    if (context.contentType === 'rating') {
      return 'circle';
    }

    // Posts can be more public
    if (context.contentType === 'post') {
      return context.isFirstTimeUser ? 'followers' : 'circle';
    }

    return 'followers';
  }

  /**
   * Preview who will see content with this privacy setting
   */
  static getAudiencePreview(
    level: VisibilityLevel, 
    context: PrivacyContext
  ): { count: string; description: string } {
    switch (level) {
      case 'public':
        return {
          count: 'Everyone',
          description: 'All Circles users can discover and see this content'
        };
      
      case 'circle':
        const circleCount = context.circleIds?.length || 0;
        return {
          count: `~${circleCount * 15} people`,
          description: `Members of your ${circleCount} food circle${circleCount > 1 ? 's' : ''}`
        };
      
      case 'followers':
        return {
          count: 'Your followers',
          description: 'People who follow you for food recommendations'
        };
      
      case 'private':
        return {
          count: 'Only you',
          description: 'This content will be private and only visible to you'
        };
      
      default:
        return {
          count: 'Unknown',
          description: 'Privacy level not recognized'
        };
    }
  }

  /**
   * Validate if user can share content with specified privacy level
   */
  static canShareWith(
    level: VisibilityLevel,
    context: PrivacyContext,
    userPermissions: { canSharePublic: boolean; hasCircles: boolean }
  ): { allowed: boolean; reason?: string } {
    
    if (level === 'public' && !userPermissions.canSharePublic) {
      return {
        allowed: false,
        reason: 'Public sharing not available for your account type'
      };
    }

    if (level === 'circle' && !userPermissions.hasCircles) {
      return {
        allowed: false,
        reason: 'Join a circle to share with your food community'
      };
    }

    return { allowed: true };
  }

  /**
   * Get context-aware privacy suggestions for specific content
   */
  static getSmartDefaults(contentType: ContentType): {
    title: string;
    suggestions: Array<{ level: VisibilityLevel; label: string; icon: string }>;
  } {
    
    const foodContent = {
      title: 'Who should see this food recommendation?',
      suggestions: [
        { level: 'circle' as VisibilityLevel, label: 'Food Circles', icon: 'users' },
        { level: 'followers' as VisibilityLevel, label: 'Followers', icon: 'user-plus' },
        { level: 'public' as VisibilityLevel, label: 'Everyone', icon: 'globe' },
        { level: 'private' as VisibilityLevel, label: 'Just Me', icon: 'lock' }
      ]
    };

    const generalContent = {
      title: 'Who should see this?',
      suggestions: [
        { level: 'followers' as VisibilityLevel, label: 'Followers', icon: 'user-plus' },
        { level: 'circle' as VisibilityLevel, label: 'Circles', icon: 'users' },
        { level: 'public' as VisibilityLevel, label: 'Public', icon: 'globe' },
        { level: 'private' as VisibilityLevel, label: 'Private', icon: 'lock' }
      ]
    };

    switch (contentType) {
      case 'list':
      case 'moment':
      case 'rating':
        return foodContent;
      default:
        return generalContent;
    }
  }
}