import { useAuth } from '../../../client/src/hooks/useAuth';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API calls
const mockApiRequest = jest.fn();
jest.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest
}));

describe('Auth Service', () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useAuth hook', () => {
    it('should initialize with no user', () => {
      mockApiRequest.mockResolvedValue(null);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('should load authenticated user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      mockApiRequest.mockResolvedValue(mockUser);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        // Wait for the query to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle authentication errors', async () => {
      mockApiRequest.mockRejectedValue(new Error('Not authenticated'));
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle login', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      mockApiRequest.mockResolvedValue(mockUser);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123'
        });
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'password123'
        }
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle login errors', async () => {
      mockApiRequest.mockRejectedValue(new Error('Invalid credentials'));
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.login({
            username: 'testuser',
            password: 'wrongpassword'
          });
        } catch (error) {
          expect(error.message).toBe('Invalid credentials');
        }
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle registration', async () => {
      const mockUser = {
        id: 1,
        username: 'newuser',
        name: 'New User',
        email: 'new@example.com'
      };
      
      mockApiRequest.mockResolvedValue(mockUser);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.register({
          username: 'newuser',
          name: 'New User',
          email: 'new@example.com',
          password: 'password123'
        });
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'newuser',
          name: 'New User',
          email: 'new@example.com',
          password: 'password123'
        }
      });
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle registration errors', async () => {
      mockApiRequest.mockRejectedValue(new Error('Username already exists'));
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.register({
            username: 'existinguser',
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'password123'
          });
        } catch (error) {
          expect(error.message).toBe('Username already exists');
        }
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle logout', async () => {
      // First login
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      mockApiRequest.mockResolvedValue(mockUser);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123'
        });
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      
      // Then logout
      mockApiRequest.mockResolvedValue({ success: true });
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST'
      });
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle profile updates', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        bio: 'Updated bio'
      };
      
      mockApiRequest.mockResolvedValue(updatedUser);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // First set initial user
      await act(async () => {
        result.current.setUser(mockUser);
      });
      
      // Then update profile
      await act(async () => {
        await result.current.updateProfile({
          name: 'Updated Name',
          bio: 'Updated bio'
        });
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/users/profile', {
        method: 'PUT',
        body: {
          name: 'Updated Name',
          bio: 'Updated bio'
        }
      });
      expect(result.current.user).toEqual(updatedUser);
    });

    it('should handle password change', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.changePassword({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword'
        });
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword'
        }
      });
    });

    it('should handle password reset request', async () => {
      mockApiRequest.mockResolvedValue({ success: true });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.requestPasswordReset('test@example.com');
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/reset-password', {
        method: 'POST',
        body: {
          email: 'test@example.com'
        }
      });
    });

    it('should handle session refresh', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      mockApiRequest.mockResolvedValue(mockUser);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.refreshSession();
      });
      
      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST'
      });
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle session expiration', async () => {
      mockApiRequest.mockRejectedValue(new Error('Session expired'));
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.refreshSession();
        } catch (error) {
          expect(error.message).toBe('Session expired');
        }
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Authentication State Management', () => {
    it('should persist authentication state', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      act(() => {
        result.current.setUser(mockUser);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear authentication state', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com'
      };
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      act(() => {
        result.current.setUser(mockUser);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      
      act(() => {
        result.current.clearUser();
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});