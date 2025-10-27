import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useSessionQuery() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export const sessionQueryOptions = {
  queryKey: ["session"],
  queryFn: () => authClient.getSession(),
  staleTime: 5 * 60 * 1000,
  retry: false,
};
