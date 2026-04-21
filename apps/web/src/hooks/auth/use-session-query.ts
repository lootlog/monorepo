import { queryOptions, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const sessionQueryKey = ["session"] as const;

export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: () => authClient.getSession(),
  staleTime: 5 * 60 * 1000,
  retry: false,
});

export function useSessionQuery() {
  return useQuery(sessionQueryOptions);
}
