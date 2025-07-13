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
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        // Check if running in native app and has stored auth data
        if (isNativeApp() && typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('authToken');
          const storedUserData = localStorage.getItem('userData');

          if (storedToken && storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              setUser(userData);
              setError(null);
              setIsLoading(false);
              return;
            } catch (e) {
              console.error('Error parsing stored user data:', e);
            }
          }
        }

        // Fall back to API check
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setError(null);
        } else {
          setUser(null);
          setError('Authentication failed');
        }
      } catch (err: any) {
        setError('Network error: ' + err.message);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for native auth events if in native app
    if (isNativeApp()) {
      const cleanup = listenForNativeAuthEvents((event) => {
        if (event.detail && event.detail.user) {
          setUser(event.detail.user);
          setError(null);
        }
      });

      return cleanup;
    }
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Login attempt with credentials:", credentials);
      const res = await apiRequest("POST", "/api/login", credentials);
      console.log("Login response status:", res.status, res.statusText);
      if (!res.ok) {
        const errorData = await res.json();
        console.log("Login error:", errorData);
        throw new Error(errorData.error || "Login failed");
      }
      const userData = await res.json();
      console.log("Login success, user data:", userData);
      return userData;
    },
    onSuccess: (userData: SelectUser) => {
      setUser(userData);
      queryClient.setQueryData(["/api/user"], userData);

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
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (userData: SelectUser) => {
      setUser(userData);
      queryClient.setQueryData(["/api/user"], userData);

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
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Logout failed");
      }
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/user"], null);

      // Clear auth data for native app
      if (isNativeApp() && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
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