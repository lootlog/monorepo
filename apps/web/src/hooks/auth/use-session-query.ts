import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

export const sessionQueryOptions = {
  queryKey: queryKeys.auth.session(),
  queryFn: () => authClient.getSession(),
  staleTime: 5 * 60 * 1000,
  retry: false,
};
