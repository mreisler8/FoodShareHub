import { 
  createContext, 
  useContext, 
  ReactNode, 
  useState, 
  useEffect 
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { useCurrentUser } from './use-current-user';
import { 
  isNativeApp, 
  getNativeAuth, 
  listenForNativeAuthEvents 
} from '@/lib/nativeAppBridge';
import { apiRequest } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isNative: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, isLoading } = useCurrentUser();
  const [isNative] = useState(isNativeApp());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Effect to listen for native app auth events
  useEffect(() => {
    if (isNative) {
      const unsubscribe = listenForNativeAuthEvents((event: CustomEvent) => {
        // Refresh user data when native app updates auth state
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      });
      
      return () => unsubscribe();
    }
  }, [isNative, queryClient]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (isNative) {
        // For native apps, use the native auth API
        const nativeAuth = getNativeAuth();
        if (nativeAuth) {
          nativeAuth.login(username, password);
          return null;
        }
      }
      
      // For web, use the traditional API
      const response = await apiRequest('POST', '/api/login', { username, password });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ 
      username, 
      email, 
      password 
    }: { 
      username: string; 
      email: string; 
      password: string;
    }) => {
      if (isNative) {
        // For native apps, use the native auth API
        const nativeAuth = getNativeAuth();
        if (nativeAuth) {
          nativeAuth.register(username, email, password);
          return null;
        }
      }
      
      // For web, use the traditional API
      const response = await apiRequest('POST', '/api/register', {
        username,
        email,
        password,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: 'Registration successful',
        description: 'Your account has been created',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (isNative) {
        // For native apps, use the native auth API
        const nativeAuth = getNativeAuth();
        if (nativeAuth) {
          nativeAuth.logout();
          return;
        }
      }
      
      // For web, use the traditional API
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Wrap the mutation functions for easier use
  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const register = async (username: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ username, email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser || null,
        isLoading,
        isNative,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};