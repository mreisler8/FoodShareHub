import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RestaurantSearch } from '../../../client/src/components/RestaurantSearch';

// Mock API calls
const mockApiRequest = jest.fn();
jest.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

describe('RestaurantSearch Component', () => {
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

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RestaurantSearch {...props} />
      </QueryClientProvider>
    );
  };

  describe('Search Input', () => {
    it('should render search input', () => {
      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should handle user input', async () => {
      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      expect(searchInput).toHaveValue('Italian');
    });

    it('should debounce search requests', async () => {
      mockApiRequest.mockResolvedValue([
        { id: 1, name: 'Italian Bistro', location: 'Downtown', cuisine: 'Italian' }
      ]);

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      
      // Type quickly
      fireEvent.change(searchInput, { target: { value: 'I' } });
      fireEvent.change(searchInput, { target: { value: 'It' } });
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      // Wait for debounce
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear search when input is empty', async () => {
      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      
      // Type and then clear
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Results', () => {
    it('should display search results', async () => {
      mockApiRequest.mockResolvedValue([
        { id: 1, name: 'Italian Bistro', location: 'Downtown', cuisine: 'Italian' },
        { id: 2, name: 'Pizza Palace', location: 'Midtown', cuisine: 'Italian' }
      ]);

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      await waitFor(() => {
        expect(screen.getByText('Italian Bistro')).toBeInTheDocument();
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      });
    });

    it('should handle empty search results', async () => {
      mockApiRequest.mockResolvedValue([]);

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No restaurants found')).toBeInTheDocument();
      });
    });

    it('should handle search errors', async () => {
      mockApiRequest.mockRejectedValue(new Error('Search failed'));

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Error' } });
      
      await waitFor(() => {
        expect(screen.getByText('Error searching restaurants')).toBeInTheDocument();
      });
    });

    it('should show loading state during search', async () => {
      mockApiRequest.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });
    });
  });

  describe('Result Selection', () => {
    it('should handle result selection', async () => {
      const mockOnSelect = jest.fn();
      mockApiRequest.mockResolvedValue([
        { id: 1, name: 'Italian Bistro', location: 'Downtown', cuisine: 'Italian' }
      ]);

      renderComponent({ onSelect: mockOnSelect });
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      await waitFor(() => {
        const result = screen.getByText('Italian Bistro');
        fireEvent.click(result);
      });
      
      expect(mockOnSelect).toHaveBeenCalledWith({
        id: 1,
        name: 'Italian Bistro',
        location: 'Downtown',
        cuisine: 'Italian'
      });
    });

    it('should handle keyboard navigation', async () => {
      mockApiRequest.mockResolvedValue([
        { id: 1, name: 'Italian Bistro', location: 'Downtown', cuisine: 'Italian' },
        { id: 2, name: 'Pizza Palace', location: 'Midtown', cuisine: 'Italian' }
      ]);

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      await waitFor(() => {
        expect(screen.getByText('Italian Bistro')).toBeInTheDocument();
      });
      
      // Arrow down to navigate
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      expect(screen.getByText('Italian Bistro')).toHaveClass('highlighted');
      
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      expect(screen.getByText('Pizza Palace')).toHaveClass('highlighted');
      
      // Enter to select
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      // Should trigger selection
    });
  });

  describe('Filters', () => {
    it('should apply cuisine filter', async () => {
      renderComponent();
      
      const cuisineFilter = screen.getByLabelText('Cuisine');
      fireEvent.change(cuisineFilter, { target: { value: 'Italian' } });
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Restaurant' } });
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('cuisine=Italian')
        );
      });
    });

    it('should apply location filter', async () => {
      renderComponent();
      
      const locationFilter = screen.getByLabelText('Location');
      fireEvent.change(locationFilter, { target: { value: 'Downtown' } });
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Restaurant' } });
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          expect.stringContaining('location=Downtown')
        );
      });
    });

    it('should clear filters', async () => {
      renderComponent();
      
      const cuisineFilter = screen.getByLabelText('Cuisine');
      fireEvent.change(cuisineFilter, { target: { value: 'Italian' } });
      
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      expect(cuisineFilter).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      expect(searchInput).toHaveAttribute('aria-label', 'Search restaurants');
      
      const searchButton = screen.getByRole('button', { name: 'Search' });
      expect(searchButton).toBeInTheDocument();
    });

    it('should announce search results to screen readers', async () => {
      mockApiRequest.mockResolvedValue([
        { id: 1, name: 'Italian Bistro', location: 'Downtown', cuisine: 'Italian' }
      ]);

      renderComponent();
      
      const searchInput = screen.getByPlaceholderText('Search restaurants...');
      fireEvent.change(searchInput, { target: { value: 'Italian' } });
      
      await waitFor(() => {
        const resultsRegion = screen.getByRole('region', { name: 'Search results' });
        expect(resultsRegion).toBeInTheDocument();
        expect(resultsRegion).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});