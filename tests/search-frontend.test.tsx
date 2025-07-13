import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UnifiedSearchModal } from '../client/src/components/search/UnifiedSearchModal';
import userEvent from '@testing-library/user-event';

// Mock the debounce hook
vi.mock('../client/src/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UnifiedSearchModal Frontend', () => {
  let queryClient: QueryClient;
  let user: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    user = userEvent.setup();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderSearchModal = (open = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UnifiedSearchModal open={open} onOpenChange={() => {}} />
      </QueryClientProvider>
    );
  };

  describe('Search Input and Debouncing', () => {
    it('should render search input when modal is open', () => {
      renderSearchModal(true);
      
      expect(screen.getByPlaceholderText(/search restaurants, lists, posts, people/i)).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      renderSearchModal(false);
      
      expect(screen.queryByPlaceholderText(/search restaurants, lists, posts, people/i)).not.toBeInTheDocument();
    });

    it('should update search query on input change', async () => {
      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'pizza');
      
      expect(searchInput).toHaveValue('pizza');
    });

    it('should show loading state during search', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'pizza');
      
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });
  });

  describe('Search Results Display', () => {
    const mockSearchResults = {
      restaurants: [
        {
          id: '1',
          name: 'Test Restaurant',
          type: 'restaurant',
          location: 'Test City',
          avgRating: 4.5,
          thumbnailUrl: 'https://example.com/image.jpg'
        }
      ],
      lists: [],
      posts: [],
      users: []
    };

    it('should display search results correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      });
    });

    it('should handle avgRating display safely', async () => {
      const resultsWithInvalidRating = {
        restaurants: [
          {
            id: '1',
            name: 'Test Restaurant',
            type: 'restaurant',
            location: 'Test City',
            avgRating: null, // Invalid rating
            thumbnailUrl: null
          }
        ],
        lists: [],
        posts: [],
        users: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => resultsWithInvalidRating
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      });

      // Should not crash and should show default rating
      expect(screen.queryByText('4.0')).toBeInTheDocument();
    });

    it('should display tabs with correct counts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/restaurants \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText(/lists \(0\)/i)).toBeInTheDocument();
        expect(screen.getByText(/posts \(0\)/i)).toBeInTheDocument();
        expect(screen.getByText(/people \(0\)/i)).toBeInTheDocument();
      });
    });

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ restaurants: [], lists: [], posts: [], users: [] })
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when search fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/search error/i)).toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid request' })
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/search error/i)).toBeInTheDocument();
      });
    });

    it('should handle image loading errors gracefully', async () => {
      const resultsWithBadImage = {
        restaurants: [
          {
            id: '1',
            name: 'Test Restaurant',
            type: 'restaurant',
            location: 'Test City',
            avgRating: 4.5,
            thumbnailUrl: 'https://invalid-image-url.jpg'
          }
        ],
        lists: [],
        posts: [],
        users: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => resultsWithBadImage
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      });

      // Simulate image error
      const img = screen.getByRole('img');
      fireEvent.error(img);

      // Should not crash and should hide broken image
      expect(img).toHaveStyle({ display: 'none' });
    });
  });

  describe('Recent Searches and Trending', () => {
    it('should display recent searches when no search query', () => {
      renderSearchModal(true);
      
      expect(screen.getByText(/recent searches/i)).toBeInTheDocument();
      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Sushi')).toBeInTheDocument();
    });

    it('should handle recent search clicks', async () => {
      renderSearchModal(true);
      
      const pizzaButton = screen.getByText('Pizza');
      await user.click(pizzaButton);

      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      expect(searchInput).toHaveValue('Pizza');
    });

    it('should display trending content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trending: [{ name: 'Trending Restaurant', type: 'restaurant' }] })
      });

      renderSearchModal(true);

      await waitFor(() => {
        expect(screen.getByText(/trending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus search input when modal opens', async () => {
      renderSearchModal(true);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
        expect(searchInput).toHaveFocus();
      });
    });

    it('should handle escape key to close modal', async () => {
      const mockOnOpenChange = vi.fn();
      
      render(
        <QueryClientProvider client={queryClient}>
          <UnifiedSearchModal open={true} onOpenChange={mockOnOpenChange} />
        </QueryClientProvider>
      );

      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, '{Escape}');

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Tab Navigation', () => {
    const mockMultiResults = {
      restaurants: [{ id: '1', name: 'Restaurant 1', type: 'restaurant' }],
      lists: [{ id: '1', name: 'List 1', type: 'list' }],
      posts: [{ id: '1', name: 'Post 1', type: 'post' }],
      users: [{ id: '1', name: 'User 1', type: 'user' }]
    };

    it('should switch between tabs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiResults
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('Restaurant 1')).toBeInTheDocument();
      });

      // Switch to lists tab
      const listsTab = screen.getByText(/lists \(1\)/i);
      await user.click(listsTab);

      expect(screen.getByText('List 1')).toBeInTheDocument();
    });

    it('should show empty state for tabs with no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ restaurants: [], lists: [], posts: [], users: [] })
      });

      renderSearchModal(true);
      
      const searchInput = screen.getByPlaceholderText(/search restaurants, lists, posts, people/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/no restaurants found/i)).toBeInTheDocument();
      });
    });
  });
});