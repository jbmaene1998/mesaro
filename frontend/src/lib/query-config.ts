import type { QueryClientConfig } from "@tanstack/react-query";
import { MutationCache, QueryCache } from "@tanstack/react-query";

import type { AppError } from "@/api/types";
import { showApiError } from "@/lib/toast";

export const queryClientConfig: QueryClientConfig = {
  queryCache: new QueryCache({
    onError: (error) => {
      const appError = error as unknown as AppError;
      if (!appError?.status || appError.status >= 500) {
        showApiError(error);
      }
    }
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const appError = error as unknown as AppError;
      if (!appError?.status || appError.status >= 500) {
        showApiError(error);
      }
    }
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true
    }
  }
};
