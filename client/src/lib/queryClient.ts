import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const options = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include" as RequestCredentials,
  };
  
  console.log("Request options:", options);
  
  const res = await fetch(url, options);
  
  console.log(`Response status: ${res.status} ${res.statusText}`);
  
  try {
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error("API request error:", error);
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
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
