import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostCard } from '../../../client/src/components/PostCard';
import { PostModal } from '../../../client/src/components/PostModal';
import { CommentList } from '../../../client/src/components/CommentList';

// Mock API calls
const mockApiRequest = jest.fn();
jest.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

describe('Post Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    mockApiRequest.mockClear();
  });

  const renderComponent = (Component: React.ComponentType<any>, props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    );
  };

  describe('PostCard Component', () => {
    const mockPost = {
      id: 1,
      content: 'Amazing Italian food! The pasta was perfectly cooked and the atmosphere was great.',
      rating: 5,
      author: {
        id: 1,
        name: 'John Doe',
        username: 'johndoe',
        profilePicture: 'profile.jpg'
      },
      restaurant: {
        id: 1,
        name: 'Italian Bistro',
        location: 'Downtown',
        cuisine: 'Italian'
      },
      photos: ['photo1.jpg', 'photo2.jpg'],
      likeCount: 12,
      commentCount: 3,
      isLiked: false,
      visibility: 'public',
      createdAt: '2025-01-01T00:00:00Z'
    };

    it('should render post content', () => {
      renderComponent(PostCard, { post: mockPost });
      
      expect(screen.getByText('Amazing Italian food! The pasta was perfectly cooked and the atmosphere was great.')).toBeInTheDocument();
      expect(screen.getByText('Italian Bistro')).toBeInTheDocument();
      expect(screen.getByText('Downtown')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display rating stars', () => {
      renderComponent(PostCard, { post: mockPost });
      
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5);
      
      // All 5 stars should be filled for rating 5
      const filledStars = stars.filter(star => star.classList.contains('filled'));
      expect(filledStars).toHaveLength(5);
    });

    it('should show post photos', () => {
      renderComponent(PostCard, { post: mockPost });
      
      const photos = screen.getAllByRole('img');
      const postPhotos = photos.filter(img => img.getAttribute('src')?.includes('photo'));
      expect(postPhotos).toHaveLength(2);
    });

    it('should display like and comment counts', () => {
      renderComponent(PostCard, { post: mockPost });
      
      expect(screen.getByText('12')).toBeInTheDocument(); // Like count
      expect(screen.getByText('3')).toBeInTheDocument(); // Comment count
    });

    it('should handle like functionality', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(PostCard, { post: mockPost });
      
      const likeButton = screen.getByRole('button', { name: /like/i });
      fireEvent.click(likeButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/likes`, {
          method: 'POST'
        });
      });
    });

    it('should handle unlike functionality', async () => {
      const likedPost = { ...mockPost, isLiked: true };
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(PostCard, { post: likedPost });
      
      const likeButton = screen.getByRole('button', { name: /unlike/i });
      fireEvent.click(likeButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/likes`, {
          method: 'DELETE'
        });
      });
    });

    it('should show edit button for post owner', () => {
      renderComponent(PostCard, { post: mockPost, currentUserId: 1 });
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should not show edit button for non-owner', () => {
      renderComponent(PostCard, { post: mockPost, currentUserId: 2 });
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should handle post deletion', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(PostCard, { post: mockPost, currentUserId: 1 });
      
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByText('Confirm Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(`/api/posts/${mockPost.id}`, {
          method: 'DELETE'
        });
      });
    });

    it('should expand/collapse long content', () => {
      const longContentPost = {
        ...mockPost,
        content: 'This is a very long post content that should be truncated initially and then expanded when the user clicks the show more button. It contains lots of details about the dining experience and should provide a good test case for the expansion functionality.'
      };
      
      renderComponent(PostCard, { post: longContentPost });
      
      const expandButton = screen.getByText('Show more');
      fireEvent.click(expandButton);
      
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('should show visibility indicator', () => {
      const privatePost = { ...mockPost, visibility: 'private' };
      renderComponent(PostCard, { post: privatePost });
      
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  describe('PostModal Component', () => {
    it('should render in create mode', () => {
      renderComponent(PostModal, { isOpen: true, mode: 'create' });
      
      expect(screen.getByText('Create Post')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search restaurants...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Share your dining experience...')).toBeInTheDocument();
    });

    it('should render in edit mode', () => {
      const editPost = {
        id: 1,
        content: 'Original content',
        rating: 4,
        restaurant: { id: 1, name: 'Test Restaurant' }
      };
      
      renderComponent(PostModal, { 
        isOpen: true, 
        mode: 'edit', 
        post: editPost 
      });
      
      expect(screen.getByText('Edit Post')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Original content')).toBeInTheDocument();
    });

    it('should handle restaurant search', async () => {
      mockApiRequest.mockResolvedValue([
        { id: 1, name: 'Italian Bistro', location: 'Downtown' }
      ]);
      
      renderComponent(PostModal, { isOpen: true, mode: 'create' });
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      await waitFor(() => {
        expect(screen.getByText('Italian Bistro')).toBeInTheDocument();
      });
    });

    it('should handle form submission', async () => {
      mockApiRequest.mockResolvedValue({ id: 1, content: 'New post' });
      
      renderComponent(PostModal, { isOpen: true, mode: 'create' });
      
      // Fill form
      const contentInput = screen.getByPlaceholderText('Share your dining experience...');
      fireEvent.change(contentInput, { target: { value: 'Great food!' } });
      
      const ratingStars = screen.getAllByTestId('rating-star');
      fireEvent.click(ratingStars[4]); // 5-star rating
      
      const submitButton = screen.getByText('Share Post');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/posts', {
          method: 'POST',
          body: expect.objectContaining({
            content: 'Great food!',
            rating: 5
          })
        });
      });
    });

    it('should validate required fields', async () => {
      renderComponent(PostModal, { isOpen: true, mode: 'create' });
      
      const submitButton = screen.getByText('Share Post');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Please select a restaurant')).toBeInTheDocument();
        expect(screen.getByText('Please share your experience')).toBeInTheDocument();
      });
    });

    it('should handle photo upload', async () => {
      renderComponent(PostModal, { isOpen: true, mode: 'create' });
      
      const fileInput = screen.getByLabelText('Upload photos');
      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('photo.jpg')).toBeInTheDocument();
      });
    });

    it('should handle visibility settings', () => {
      renderComponent(PostModal, { isOpen: true, mode: 'create' });
      
      const visibilitySelect = screen.getByLabelText('Visibility');
      fireEvent.change(visibilitySelect, { target: { value: 'private' } });
      
      expect(visibilitySelect).toHaveValue('private');
    });
  });

  describe('CommentList Component', () => {
    const mockComments = [
      {
        id: 1,
        content: 'Great review! I want to try this place.',
        author: {
          id: 2,
          name: 'Jane Smith',
          username: 'janesmith',
          profilePicture: 'jane.jpg'
        },
        createdAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 2,
        content: 'I agree, the pasta there is amazing!',
        author: {
          id: 3,
          name: 'Bob Johnson',
          username: 'bobjohnson',
          profilePicture: 'bob.jpg'
        },
        createdAt: '2025-01-01T01:00:00Z'
      }
    ];

    it('should render comments', () => {
      renderComponent(CommentList, { 
        postId: 1, 
        comments: mockComments 
      });
      
      expect(screen.getByText('Great review! I want to try this place.')).toBeInTheDocument();
      expect(screen.getByText('I agree, the pasta there is amazing!')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should handle adding new comment', async () => {
      mockApiRequest.mockResolvedValue({ 
        id: 3, 
        content: 'New comment',
        author: { id: 1, name: 'Current User' }
      });
      
      renderComponent(CommentList, { 
        postId: 1, 
        comments: mockComments 
      });
      
      const commentInput = screen.getByPlaceholderText('Add a comment...');
      fireEvent.change(commentInput, { target: { value: 'New comment' } });
      
      const submitButton = screen.getByText('Post');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/posts/1/comments', {
          method: 'POST',
          body: { content: 'New comment' }
        });
      });
    });

    it('should handle comment deletion', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(CommentList, { 
        postId: 1, 
        comments: mockComments,
        currentUserId: 2
      });
      
      const deleteButton = screen.getByTestId('delete-comment-1');
      fireEvent.click(deleteButton);
      
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/comments/1', {
          method: 'DELETE'
        });
      });
    });

    it('should show load more button when there are more comments', () => {
      renderComponent(CommentList, { 
        postId: 1, 
        comments: mockComments,
        hasMore: true
      });
      
      expect(screen.getByText('Load more comments')).toBeInTheDocument();
    });

    it('should handle loading more comments', async () => {
      const moreComments = [
        {
          id: 4,
          content: 'Another comment',
          author: { id: 4, name: 'Another User' },
          createdAt: '2025-01-01T02:00:00Z'
        }
      ];
      
      mockApiRequest.mockResolvedValue(moreComments);
      
      renderComponent(CommentList, { 
        postId: 1, 
        comments: mockComments,
        hasMore: true
      });
      
      const loadMoreButton = screen.getByText('Load more comments');
      fireEvent.click(loadMoreButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/posts/1/comments?offset=2');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      const mockPost = {
        id: 1,
        content: 'Test content',
        rating: 5,
        author: { id: 1, name: 'Test User' },
        restaurant: { id: 1, name: 'Test Restaurant' },
        likeCount: 0,
        commentCount: 0,
        isLiked: false
      };
      
      renderComponent(PostCard, { post: mockPost });
      
      const likeButton = screen.getByRole('button', { name: /like/i });
      expect(likeButton).toHaveAttribute('aria-label');
      
      const commentButton = screen.getByRole('button', { name: /comment/i });
      expect(commentButton).toHaveAttribute('aria-label');
    });

    it('should announce like state changes', async () => {
      const mockPost = {
        id: 1,
        content: 'Test content',
        rating: 5,
        author: { id: 1, name: 'Test User' },
        restaurant: { id: 1, name: 'Test Restaurant' },
        likeCount: 0,
        commentCount: 0,
        isLiked: false
      };
      
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(PostCard, { post: mockPost });
      
      const likeButton = screen.getByRole('button', { name: /like/i });
      fireEvent.click(likeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Liked')).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});