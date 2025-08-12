import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { isNativeApp, listenForNativeAuthEvents } from "../lib/nativeAppBridge";

// Define the types for auth-related data structures
type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: string | null; // Changed to string for better error handling
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

// Login schema with validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema with validation (aligns with insertUserSchema from shared/schema)
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"), 
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
});

// Type definitions based on schemas
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = {
  username: string;
  password: string;
  name: string;
  bio: string | null;
  profilePicture: string | null;
};

// Create auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SelectUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hasRetried = false;
    
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Enhanced validation for native app auth
        if (isNativeApp() && typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('authToken');
          const storedUserData = localStorage.getItem('userData');

          if (storedToken && storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);

              // Validate user data structure
              if (userData && typeof userData === 'object' && 
                  userData.id && typeof userData.id === 'number' &&
                  userData.username && typeof userData.username === 'string' &&
                  userData.name && typeof userData.name === 'string') {

                setUser(userData);
                setError(null);
                setIsLoading(false);
                return;
              } else {
                console.warn('Invalid stored user data structure');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
              }
            } catch (e) {
              console.error('Error parsing stored user data:', e);
              localStorage.removeItem('authToken');
              localStorage.removeItem('userData');
            }
          }
        }

        // Enhanced API authentication check
        const response = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const userData = await response.json();

          // Validate API response structure
          if (userData && typeof userData === 'object' && 
              userData.id && typeof userData.id === 'number' &&
              userData.username && typeof userData.username === 'string' &&
              userData.name && typeof userData.name === 'string') {

            setUser(userData);
            setError(null);
          } else {
            console.error('Invalid user data received from API');
            setUser(null);
            setError('Invalid authentication response');
          }
        } else if (response.status === 401) {
          // Clear any invalid stored data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
          }
          setUser(null);
          setError(null); // Don't show error for unauthenticated state
        } else {
          console.error('Authentication check failed with status:', response.status);
          setUser(null);
          
          // Add single retry for transient errors (not 401)
          if (!hasRetried && response.status !== 401) {
            console.log('Retrying authentication check...');
            hasRetried = true;
            setTimeout(() => {
              checkAuth();
            }, 1000);
            return;
          }
          
          setError('Authentication check failed');
        }
      } catch (err: any) {
        console.error('Authentication check error:', err);
        
        // Add single retry for network errors
        if (!hasRetried) {
          console.log('Retrying authentication check after network error...');
          hasRetried = true;
          setTimeout(() => {
            checkAuth();
          }, 2000);
          return;
        }
        
        setError('Network error during authentication check');
        setUser(null);

        // Clear potentially corrupted data on network errors
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Enhanced native app event listener with validation
    if (isNativeApp()) {
      const cleanup = listenForNativeAuthEvents((event) => {
        if (event.detail && event.detail.user) {
          const userData = event.detail.user;

          // Validate event data structure
          if (userData && typeof userData === 'object' && 
              userData.id && typeof userData.id === 'number' &&
              userData.username && typeof userData.username === 'string' &&
              userData.name && typeof userData.name === 'string') {

            setUser(userData);
            setError(null);
          } else {
            console.warn('Invalid user data received from native auth event');
            setError('Invalid authentication data');
          }
        }
      });

      return cleanup;
    }
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Attempting login for:", credentials.username);
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include",
        });

        console.log("Login response status:", response.status);
        console.log("Login response headers:", Object.fromEntries(response.headers));

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          console.log("Error response content-type:", contentType);

          let errorMessage = "Login failed";

          if (contentType && contentType.includes("application/json")) {
            try {
              const error = await response.json();
              errorMessage = error.message || error.error || "Login failed";
            } catch (parseError) {
              console.error("Failed to parse error JSON:", parseError);
              errorMessage = `Server error (${response.status})`;
            }
          } else {
            // If we're getting HTML instead of JSON, log it for debugging
            const textResponse = await response.text();
            console.error("Received HTML response instead of JSON:", textResponse.substring(0, 500));
            errorMessage = `Server error: received HTML instead of JSON (${response.status})`;
          }

          throw new Error(errorMessage);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await response.text();
          console.error("Success response is not JSON:", textResponse.substring(0, 500));
          throw new Error("Server returned invalid response format");
        }

        return response.json();
      } catch (error) {
        console.error("Login mutation error:", error);
        throw error;
      }
    },
    onSuccess: (userData: SelectUser) => {
      setUser(userData);
      queryClient.setQueryData(["/api/me"], userData);

      // Store auth data for native app
      if (isNativeApp() && typeof window !== 'undefined') {
        const authToken = `auth_${Date.now()}`;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userData', JSON.stringify(userData));
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
      });

      // Navigate to home page after successful login
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    },
    onError: (error: Error) => {
      // More specific error handling based on error message
      let title = "Sign in failed";
      let description = error.message;

      if (error.message.includes("email")) {
        title = "Invalid email address";
        description = "Please check your email address and try again.";
      } else if (error.message.includes("password")) {
        title = "Incorrect password";
        description = "Please check your password and try again.";
      } else if (error.message.includes("account")) {
        title = "Account not found";
        description = "No account found with this email address. Please sign up first.";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("/api/register", {
        method: "POST",
        body: userData
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (userData: SelectUser) => {
      setUser(userData);
      queryClient.setQueryData(["/api/me"], userData);

      // Store auth data for native app
      if (isNativeApp() && typeof window !== 'undefined') {
        const authToken = `auth_${Date.now()}`;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userData', JSON.stringify(userData));
      }

      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.name}!`,
      });

      // Navigate to home page after successful registration
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    },
    onError: (error: Error) => {
      // More specific error handling for registration
      let title = "Account creation failed";
      let description = error.message;

      if (error.message.includes("exists") || error.message.includes("already")) {
        title = "Account already exists";
        description = "An account with this email already exists. Please sign in instead.";
      } else if (error.message.includes("email")) {
        title = "Invalid email address";
        description = "Please enter a valid email address.";
      } else if (error.message.includes("password")) {
        title = "Password requirements not met";
        description = "Password must be at least 6 characters long.";
      } else if (error.message.includes("name")) {
        title = "Name required";
        description = "Please enter your full name.";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/logout", {
        method: "POST"
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Logout failed");
      }
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/me"], null);
      queryClient.clear(); // Clear all query cache

      // Clear ALL auth data from localStorage - not just native app
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        // Clear any other auth-related localStorage items
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });

      // Navigate to auth page after logout
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}