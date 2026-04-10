import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: () => authClient.getSession(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export const sessionQueryOptions = {
  queryKey: queryKeys.auth.session(),
  queryFn: () => authClient.getSession(),
  staleTime: 5 * 60 * 1000,
  retry: false,
};
