/**
 * TanStack Query client configuration.
 */
import { QueryClient } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry(failureCount, error) {
        if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }

        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});
