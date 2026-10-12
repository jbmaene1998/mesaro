import { QueryClient } from "@tanstack/react-query";

import { queryClientConfig } from "@/lib/query-config";

export const queryClient = new QueryClient(queryClientConfig);

