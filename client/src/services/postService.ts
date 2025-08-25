import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';

// Post data interfaces
export interface CreatePostData {
  restaurantId: string;
  restaurantName?: string;
  restaurantLocation?: string;
  content?: string;
  rating: number;
  liked?: string;
  disliked?: string;
  notes?: string;
  visibility?: {
    public: boolean;
    followers: boolean;
    circleIds: number[];
  };
  visibilitySettings?: {
    public: boolean;
    followers: boolean;
    circleIds: number[];
  };
  dishesTried?: string[];
  images?: string[];
  videos?: string[];
  media?: any[];
  imageTags?: string[];
  tags?: string[];
  taggedListIds?: number[];
  priceAssessment?: string;
  atmosphere?: string;
  serviceRating?: number;
  dietaryOptions?: string[];
  postType?: 'moment' | 'dish' | 'restaurant';
  metadata?: Record<string, any>;
  userId?: number;
  postId?: number;
}

export interface UpdatePostData extends Partial<CreatePostData> {
  id: number;
}

// Post service class for centralized post handling
export class PostService {
  private static instance: PostService;

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService();
    }
    return PostService.instance;
  }

  /**
   * Create a new post
   */
  async createPost(postData: CreatePostData): Promise<any> {
    try {
      // Handle unified data structure
      const processedData = this.processPostData(postData);
      
      const response = await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify(processedData),
      });
      return response;
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  /**
   * Process post data to ensure consistent structure
   */
  processPostData(postData: CreatePostData): CreatePostData {
    // Build content from structured fields if provided
    let content = postData.content || '';
    
    if (postData.liked || postData.disliked || postData.notes) {
      const parts: string[] = [];
      
      if (postData.liked) {
        parts.push(`What I liked: ${postData.liked}`);
      }
      
      if (postData.disliked) {
        parts.push(`What I didn't like: ${postData.disliked}`);
      }
      
      if (postData.notes) {
        parts.push(`Additional notes: ${postData.notes}`);
      }
      
      content = parts.join('\n\n');
    }

    // Handle visibility settings
    const visibility = postData.visibilitySettings || postData.visibility || {
      public: true,
      followers: false,
      circleIds: []
    };

    // Handle media files
    const images = postData.images || [];
    const videos = postData.videos || [];
    
    if (postData.media && Array.isArray(postData.media)) {
      postData.media.forEach(item => {
        if (item.type === 'image' || item.url?.includes('image')) {
          images.push(item.url || item);
        } else if (item.type === 'video' || item.url?.includes('video')) {
          videos.push(item.url || item);
        }
      });
    }

    return {
      ...postData,
      content,
      visibility,
      images,
      videos,
      postType: postData.postType || 'moment'
    };
  }

  /**
   * Update an existing post
   */
  async updatePost(postData: UpdatePostData): Promise<any> {
    try {
      const { id, ...updateData } = postData;
      const response = await apiRequest(`/api/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return response;
    } catch (error) {
      console.error('Error updating post:', error);
      throw new Error('Failed to update post');
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: number): Promise<void> {
    try {
      await apiRequest(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error('Failed to delete post');
    }
  }

  /**
   * Get posts for feed
   */
  async getFeedPosts(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await apiRequest(`/api/posts?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching feed posts:', error);
      throw new Error('Failed to fetch posts');
    }
  }

  /**
   * Get user's posts
   */
  async getUserPosts(userId: number, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await apiRequest(`/api/users/${userId}/posts?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw new Error('Failed to fetch user posts');
    }
  }

  /**
   * Like/unlike a post
   */
  async togglePostLike(postId: number): Promise<any> {
    try {
      const response = await apiRequest(`/api/posts/${postId}/like`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw new Error('Failed to toggle post like');
    }
  }

  /**
   * Add comment to post
   */
  async addComment(postId: number, content: string): Promise<any> {
    try {
      const response = await apiRequest(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return response;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }



  /**
   * Validate post data before submission
   */
  validatePostData(postData: CreatePostData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!postData.restaurantId) {
      errors.push('Restaurant selection is required');
    }

    if (!postData.content?.trim()) {
      errors.push('Post content is required');
    }

    if (!postData.rating || postData.rating < 1 || postData.rating > 5) {
      errors.push('Rating must be between 1 and 5 stars');
    }

    // Post type validation
    const validPostTypes = ['moment', 'dish', 'list'];
    if (!validPostTypes.includes(postData.postType)) {
      errors.push(`Post type must be one of: ${validPostTypes.join(', ')}`);
    }

    // Post type specific validation
    if (postData.postType === 'dish') {
      if (!postData.metadata?.dishName?.trim()) {
        errors.push('Dish name is required for dish posts');
      }
    }

    // Visibility validation
    if (!postData.visibility) {
      errors.push('Visibility settings are required');
    } else {
      const { public: isPublic, followers, circleIds } = postData.visibility;
      if (!isPublic && !followers && (!circleIds || circleIds.length === 0)) {
        errors.push('At least one visibility option must be selected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get post type specific validation rules
   */
  getPostTypeRequirements(postType: string): { required: string[]; optional: string[] } {
    switch (postType) {
      case 'dish':
        return {
          required: ['restaurantId', 'rating', 'content'],
          optional: ['dishesTried', 'tags', 'metadata.dishName', 'metadata.category']
        };
      case 'moment':
        return {
          required: ['restaurantId', 'rating', 'content'],
          optional: ['images', 'videos', 'tags']
        };
      case 'list':
        return {
          required: ['restaurantId', 'content'],
          optional: ['rating', 'metadata.listContext']
        };
      default:
        return {
          required: ['restaurantId', 'content'],
          optional: []
        };
    }
  }

}

// Create and export singleton instance
export const postService = PostService.getInstance();