import { useQuery, queryOptions } from "@tanstack/react-query";
import { authApiClient } from "@/lib/api-client/api-client";

export const authScopesQueryOptions = queryOptions({
  queryKey: ["auth-scopes"],
  queryFn: () =>
    authApiClient.get<string[]>(`/auth/@me/scopes`).then((res) => res.data),
});

export const useAuthScopes = () => {
  const query = useQuery({
    ...authScopesQueryOptions,
  });

  return query;
};
