import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { parseErrorResponse } from "./errorUtils";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Standard mutation error handler
 * Use this in mutations that need default error handling behavior
 * 
 * Example:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: async (data) => apiRequest("POST", "/api/endpoint", data),
 *   onError: handleMutationError,
 *   onSuccess: () => { ... }
 * });
 * ```
 */
export async function handleMutationError(error: unknown) {
  const parsedError = await parseErrorResponse(error);
  
  toast({
    title: parsedError.title,
    description: parsedError.details 
      ? `${parsedError.message}\n\n${parsedError.details}`
      : parsedError.message,
    variant: "destructive",
  });
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
    // Build URL from queryKey, handling query params
    let url = queryKey[0] as string;
    
    // If there's a second element and it's an object, treat it as query params
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams();
      const paramsObj = queryKey[1] as Record<string, string | number | boolean | null | undefined>;
      
      for (const [key, value] of Object.entries(paramsObj)) {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    const res = await fetch(url, {
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
      retry: false,
    },
    mutations: {
      retry: false,
      // Note: Use the exported handleMutationError function in individual mutations
      // for consistent error handling. Not set globally to avoid duplicate toasts
      // when mutations define their own onError handlers.
    },
  },
});
