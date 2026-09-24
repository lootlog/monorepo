import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const sessionQueryKey = ["session"] as const;

export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: ({ signal }) => authClient.getSession({ fetchOptions: { signal } }),
  staleTime: 5 * 60 * 1000,
  retry: false,
});
