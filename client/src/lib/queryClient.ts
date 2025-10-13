import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { OfflineAuthGuard } from "@/utils/offlineAuthGuard";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone response before consuming body to avoid "body used already" errors
    const clonedRes = res.clone();
    
    try {
      const text = await clonedRes.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (e) {
      // If text() fails (malformed response), use status text
      if (e instanceof Error && !e.message.startsWith(`${res.status}:`)) {
        console.error('Error parsing response:', e);
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      // Re-throw the error we just created
      throw e;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Never retry on admin deletion (401/403 with specific message)
        if (error instanceof Error && error.message.includes('Account access revoked')) {
          return false;
        }
        
        // Retry network errors up to 3 times
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log(`🔄 Network error - retry ${failureCount}/3`);
          return failureCount < 3;
        }
        
        // Don't retry other errors
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Never retry mutations on admin deletion
        if (error instanceof Error && error.message.includes('Account access revoked')) {
          return false;
        }
        
        // Retry network errors for mutations once
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.log(`🔄 Mutation network error - retry ${failureCount}/1`);
          return failureCount < 1;
        }
        
        return false;
      },
    },
  },
});
