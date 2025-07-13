
import { test, expect } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedPage from '../client/src/pages/feed';
import { Button } from '../client/src/components/Button';

// Mock the auth hook
jest.mock('../client/src/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Test User' } })
}));

// Mock wouter
jest.mock('wouter', () => ({
  useLocation: () => ['/', jest.fn()]
}));

describe('QA Checklist Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  describe('1. Infinite Scroll Feed', () => {
    test('should load initial posts on feed load', async () => {
      // Mock initial feed data
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [
            { id: 1, content: 'Test post 1', author: { name: 'User 1' } },
            { id: 2, content: 'Test post 2', author: { name: 'User 2' } }
          ],
          pagination: { hasMore: true, page: 1 }
        })
      });

      render(
        <QueryClientProvider client={queryClient}>
          <FeedPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test post 1')).toBeInTheDocument();
        expect(screen.getByText('Test post 2')).toBeInTheDocument();
      });
    });

    test('should show "You\'ve reached the end" message when no more posts', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [],
          pagination: { hasMore: false, page: 1 }
        })
      });

      render(
        <QueryClientProvider client={queryClient}>
          <FeedPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
      });
    });
  });

  describe('2. Unified Button Component', () => {
    test('should render primary button with correct classes', () => {
      render(<Button variant="primary">Primary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
      expect(button).toHaveClass('text-primary-foreground');
      expect(button).toHaveClass('h-10'); // md size default
    });

    test('should render secondary button with correct classes', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
      expect(button).toHaveClass('text-secondary-foreground');
    });

    test('should render icon button with correct size', () => {
      render(<Button size="icon">+</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('w-10');
    });

    test('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('opacity-60');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    test('should show loading state', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('svg')).toHaveClass('animate-spin');
    });

    test('should handle hover and focus states', () => {
      render(<Button>Hover Button</Button>);
      
      const button = screen.getByRole('button');
      
      // Test hover
      fireEvent.mouseEnter(button);
      expect(button).toHaveClass('hover:bg-primary/90');
      
      // Test focus
      fireEvent.focus(button);
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    test('should handle active state with scale', () => {
      render(<Button>Active Button</Button>);
      
      const button = screen.getByRole('button');
      
      // Test active state
      fireEvent.mouseDown(button);
      expect(button).toHaveClass('active:scale-98');
    });
  });
});
