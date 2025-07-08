import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ListCard } from '../../../client/src/components/ListCard';
import { CreateListModal } from '../../../client/src/components/CreateListModal';
import { ListItemCard } from '../../../client/src/components/ListItemCard';

// Mock API calls
const mockApiRequest = jest.fn();
jest.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

describe('List Components', () => {
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

  describe('ListCard Component', () => {
    const mockList = {
      id: 1,
      name: 'Best Pizza Places',
      description: 'My favorite pizza spots in the city',
      tags: ['pizza', 'italian', 'casual'],
      visibility: 'public',
      itemCount: 5,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };

    it('should render list information', () => {
      renderComponent(ListCard, { list: mockList });
      
      expect(screen.getByText('Best Pizza Places')).toBeInTheDocument();
      expect(screen.getByText('My favorite pizza spots in the city')).toBeInTheDocument();
      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    it('should display tags', () => {
      renderComponent(ListCard, { list: mockList });
      
      expect(screen.getByText('pizza')).toBeInTheDocument();
      expect(screen.getByText('italian')).toBeInTheDocument();
      expect(screen.getByText('casual')).toBeInTheDocument();
    });

    it('should show visibility indicator', () => {
      renderComponent(ListCard, { list: mockList });
      
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    it('should handle click to view list', () => {
      const mockOnClick = jest.fn();
      renderComponent(ListCard, { list: mockList, onClick: mockOnClick });
      
      fireEvent.click(screen.getByText('Best Pizza Places'));
      expect(mockOnClick).toHaveBeenCalledWith(mockList);
    });

    it('should show edit button for owner', () => {
      renderComponent(ListCard, { list: mockList, isOwner: true });
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should not show edit button for non-owner', () => {
      renderComponent(ListCard, { list: mockList, isOwner: false });
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should handle save/unsave functionality', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(ListCard, { list: mockList, isSaved: false });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/lists/1/save', {
          method: 'POST'
        });
      });
    });
  });

  describe('CreateListModal Component', () => {
    it('should render form fields', () => {
      renderComponent(CreateListModal, { isOpen: true });
      
      expect(screen.getByLabelText('List Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      mockApiRequest.mockResolvedValue({ id: 1, name: 'New List' });
      
      renderComponent(CreateListModal, { isOpen: true });
      
      fireEvent.change(screen.getByLabelText('List Name'), {
        target: { value: 'New List' }
      });
      fireEvent.change(screen.getByLabelText('Description'), {
        target: { value: 'A new list description' }
      });
      fireEvent.change(screen.getByLabelText('Tags'), {
        target: { value: 'tag1, tag2' }
      });
      
      fireEvent.click(screen.getByText('Create List'));
      
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/api/lists', {
          method: 'POST',
          body: expect.objectContaining({
            name: 'New List',
            description: 'A new list description',
            tags: ['tag1', 'tag2']
          })
        });
      });
    });

    it('should validate required fields', async () => {
      renderComponent(CreateListModal, { isOpen: true });
      
      fireEvent.click(screen.getByText('Create List'));
      
      await waitFor(() => {
        expect(screen.getByText('List name is required')).toBeInTheDocument();
      });
    });

    it('should handle visibility settings', () => {
      renderComponent(CreateListModal, { isOpen: true });
      
      const privateRadio = screen.getByLabelText('Private');
      const publicRadio = screen.getByLabelText('Public');
      const circleRadio = screen.getByLabelText('Circle');
      
      expect(privateRadio).toBeInTheDocument();
      expect(publicRadio).toBeInTheDocument();
      expect(circleRadio).toBeInTheDocument();
      
      fireEvent.click(publicRadio);
      expect(publicRadio).toBeChecked();
    });

    it('should check for duplicate names', async () => {
      mockApiRequest.mockResolvedValue([{ id: 1, name: 'Existing List' }]);
      
      renderComponent(CreateListModal, { isOpen: true });
      
      const nameInput = screen.getByLabelText('List Name');
      fireEvent.change(nameInput, { target: { value: 'Existing List' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('A list with this name already exists')).toBeInTheDocument();
      });
    });

    it('should handle modal close', () => {
      const mockOnClose = jest.fn();
      renderComponent(CreateListModal, { isOpen: true, onClose: mockOnClose });
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('ListItemCard Component', () => {
    const mockListItem = {
      id: 1,
      restaurant: {
        id: 1,
        name: 'Italian Bistro',
        location: 'Downtown',
        cuisine: 'Italian'
      },
      rating: 4,
      priceAssessment: 'Fair',
      notes: 'Great pasta and atmosphere',
      addedAt: '2025-01-01T00:00:00Z'
    };

    it('should render restaurant information', () => {
      renderComponent(ListItemCard, { item: mockListItem });
      
      expect(screen.getByText('Italian Bistro')).toBeInTheDocument();
      expect(screen.getByText('Downtown')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
    });

    it('should display rating stars', () => {
      renderComponent(ListItemCard, { item: mockListItem });
      
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(5);
      
      // Check that 4 stars are filled
      const filledStars = stars.filter(star => star.classList.contains('filled'));
      expect(filledStars).toHaveLength(4);
    });

    it('should show price assessment', () => {
      renderComponent(ListItemCard, { item: mockListItem });
      
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('should display notes', () => {
      renderComponent(ListItemCard, { item: mockListItem });
      
      expect(screen.getByText('Great pasta and atmosphere')).toBeInTheDocument();
    });

    it('should handle edit functionality', () => {
      const mockOnEdit = jest.fn();
      renderComponent(ListItemCard, { 
        item: mockListItem, 
        canEdit: true, 
        onEdit: mockOnEdit 
      });
      
      fireEvent.click(screen.getByText('Edit'));
      expect(mockOnEdit).toHaveBeenCalledWith(mockListItem);
    });

    it('should handle delete functionality', async () => {
      const mockOnDelete = jest.fn();
      mockApiRequest.mockResolvedValue({ success: true });
      
      renderComponent(ListItemCard, { 
        item: mockListItem, 
        canEdit: true, 
        onDelete: mockOnDelete 
      });
      
      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('Confirm'));
      
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith(mockListItem.id);
      });
    });

    it('should expand/collapse notes', () => {
      const longNoteItem = {
        ...mockListItem,
        notes: 'This is a very long note that should be truncated initially and then expanded when clicked. It contains lots of details about the restaurant experience.'
      };
      
      renderComponent(ListItemCard, { item: longNoteItem });
      
      const expandButton = screen.getByText('Show more');
      fireEvent.click(expandButton);
      
      expect(screen.getByText('Show less')).toBeInTheDocument();
    });

    it('should handle comments section', () => {
      renderComponent(ListItemCard, { 
        item: mockListItem, 
        showComments: true 
      });
      
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mockList = {
        id: 1,
        name: 'Test List',
        description: 'Test description',
        tags: ['test'],
        visibility: 'public',
        itemCount: 1
      };
      
      renderComponent(ListCard, { list: mockList });
      
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'List: Test List');
    });

    it('should support keyboard navigation', () => {
      const mockList = {
        id: 1,
        name: 'Test List',
        description: 'Test description',
        tags: ['test'],
        visibility: 'public',
        itemCount: 1
      };
      
      renderComponent(ListCard, { list: mockList });
      
      const listCard = screen.getByRole('article');
      expect(listCard).toHaveAttribute('tabIndex', '0');
      
      fireEvent.keyDown(listCard, { key: 'Enter' });
      // Should trigger onClick
    });

    it('should announce loading states', async () => {
      renderComponent(CreateListModal, { isOpen: true });
      
      fireEvent.change(screen.getByLabelText('List Name'), {
        target: { value: 'New List' }
      });
      
      mockApiRequest.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      fireEvent.click(screen.getByText('Create List'));
      
      await waitFor(() => {
        expect(screen.getByText('Creating list...')).toBeInTheDocument();
        expect(screen.getByText('Creating list...')).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});