import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, url: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

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

    return response;
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
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
      console.error("Query function error:", error);
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
          });

          console.log("Query response status:", response.status, response.statusText);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Query failed for", queryKey[0], ":", errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          console.log("Query response data:", data);
          return data;
        } catch (error) {
          console.error("Query function error:", error);
          throw error;
        }
      },
      retry: (failureCount, error) => {
        // Don't retry on 401 (authentication) or 404 (not found) errors
        if (error.message.includes('401') || error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: false,
    },
  },
});