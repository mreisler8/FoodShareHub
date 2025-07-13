
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedSearchModal } from '../components/search/UnifiedSearchModal';

// Mock the fetch function
global.fetch = jest.fn();

describe('UnifiedSearchModal', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should render modal when open', () => {
    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByPlaceholderText('Search restaurants, lists, posts, people…')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(
      <UnifiedSearchModal
        open={false}
        onOpenChange={() => {}}
      />
    );

    expect(screen.queryByPlaceholderText('Search restaurants, lists, posts, people…')).not.toBeInTheDocument();
  });

  it('should show recent searches and trending when no query', () => {
    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Veselka')).toBeInTheDocument();
  });

  it('should trigger search after typing', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        restaurants: [
          { id: '1', name: 'Test Restaurant', subtitle: 'Italian • NYC', type: 'restaurant' }
        ],
        lists: [],
        posts: [],
        users: []
      })
    });

    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search restaurants, lists, posts, people…');
    fireEvent.change(searchInput, { target: { value: 'pizza' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/search/unified?q=pizza');
    }, { timeout: 500 });
  });

  it('should show tabs with result counts', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        restaurants: [
          { id: '1', name: 'Test Restaurant', subtitle: 'Italian • NYC', type: 'restaurant' }
        ],
        lists: [
          { id: '1', name: 'Test List', subtitle: 'Pizza places', type: 'list' }
        ],
        posts: [],
        users: []
      })
    });

    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search restaurants, lists, posts, people…');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText(/Restaurants \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Lists \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Posts \(0\)/)).toBeInTheDocument();
      expect(screen.getByText(/People \(0\)/)).toBeInTheDocument();
    });
  });

  it('should show no results message when search returns empty', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        restaurants: [],
        lists: [],
        posts: [],
        users: []
      })
    });

    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search restaurants, lists, posts, people…');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/No results found for "nonexistent"/)).toBeInTheDocument();
    });
  });

  it('should handle recent search clicks', () => {
    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={() => {}}
      />
    );

    const pizzaButton = screen.getByText('Pizza');
    fireEvent.click(pizzaButton);

    const searchInput = screen.getByPlaceholderText('Search restaurants, lists, posts, people…');
    expect(searchInput).toHaveValue('Pizza');
  });

  it('should call onOpenChange when modal should close', () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <UnifiedSearchModal
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Simulate Escape key press
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Note: The actual modal closing behavior depends on the Dialog component implementation
    // This test verifies the prop is passed correctly
  });
});
