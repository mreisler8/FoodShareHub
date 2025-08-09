import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  const finalOptions: RequestInit = {
    method: 'GET',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      "Cache-Control": "no-cache",
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }

    // Invalidate queries after successful mutations
    if (response.ok && (finalOptions.method === 'POST' || finalOptions.method === 'PUT' || finalOptions.method === 'DELETE')) {
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return key?.startsWith('/api/');
          }
        });
      }, 100);
    }

    return response;
  } catch (error) {
    console.error(`API request failed: ${finalOptions.method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Query request for key: ${queryKey[0]}`);

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    console.log(`Query response status: ${res.status} ${res.statusText}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("Returning null for 401 status as configured");
      return null;
    }

    try {
      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Query response data:`, data);
      return data;
    } catch (error) {
      console.error("Query function error:", error instanceof Error ? error.message : JSON.stringify(error));
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        console.log("Query request for key:", queryKey[0]);

        try {
          const response = await fetch(queryKey[0] as string, {
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          console.log("Query response status:", response.status, response.statusText);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Query failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Query failed for", queryKey[0], ":", errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          console.log("Query response data:", data);
          return data;
        } catch (error) {
          console.error("Query function error:", error instanceof Error ? error.message : JSON.stringify(error));
          throw error;
        }
      },
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5)
      gcTime: 10 * 60 * 1000, // 10 minutes (TanStack Query v5)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
      onSuccess: () => {
        // Invalidate related queries on successful mutations
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return key?.startsWith('/api/');
          }
        });
      },
    },
  },
});

// Make queryClient globally available for cache invalidation
declare global {
  interface Window {
    queryClient: typeof queryClient;
    gtag?: (...args: any[]) => void;
  }
}

if (typeof window !== 'undefined') {
  window.queryClient = queryClient;
}

// Add global error handling for queries
queryClient.setMutationDefaults(['post', 'put', 'patch', 'delete'], {
  onError: (error: any) => {
    console.error('Mutation error:', error);

    // Log to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `API Error: ${error.message}`,
        fatal: false,
      });
    }
  },
});