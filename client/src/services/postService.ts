import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';

// Post data interfaces
export interface CreatePostData {
  restaurantId: string;
  content: string;
  rating: number;
  visibility: {
    public: boolean;
    followers: boolean;
    circleIds: number[];
  };
  dishesTried?: string[];
  images?: string[];
  videos?: string[];
  imageTags?: string[];
  tags?: string[];
  priceAssessment?: string;
  atmosphere?: string;
  serviceRating?: number;
  dietaryOptions?: string[];
  postType: 'moment' | 'dish' | 'list';
  metadata?: Record<string, any>;
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
      const response = await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
      return response;
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
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
   * Process form data into structured post data
   */
  processPostData(formData: any, selectedRestaurant: any): CreatePostData {
    // Combine structured fields into content for current schema compatibility
    const contentParts = [];
    if (formData.liked?.trim()) contentParts.push(`What I liked: ${formData.liked.trim()}`);
    if (formData.disliked?.trim()) contentParts.push(`What I didn't like: ${formData.disliked.trim()}`);
    if (formData.notes?.trim()) contentParts.push(`Additional notes: ${formData.notes.trim()}`);
    const content = contentParts.join('\n\n');

    // Handle restaurant ID - if Google place, we need to create/find the restaurant first
    if (selectedRestaurant.source === 'google') {
      throw new Error('Google Places integration not yet implemented');
    }

    const restaurantId = selectedRestaurant.id.toString();

    return {
      restaurantId,
      content,
      rating: formData.rating,
      visibility: formData.visibilitySettings,
      images: formData.imageUrls || [],
      videos: formData.videoUrls || [],
      imageTags: formData.imageTags || [],
      tags: formData.tags || [],
      priceAssessment: formData.priceAssessment || null,
      atmosphere: formData.atmosphere || null,
      serviceRating: formData.serviceRating || null,
      dietaryOptions: formData.dietaryOptions || [],
      dishesTried: formData.dishesTried || [],
      postType: 'moment', // Default to moment for now
      metadata: {}
    };
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

}

// Create and export singleton instance
export const postService = PostService.getInstance();