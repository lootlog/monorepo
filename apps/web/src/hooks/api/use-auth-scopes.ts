import { useQuery, queryOptions } from "@tanstack/react-query";
import { authApiClient } from "@/lib/api-client/api-client";

const normalizeAuthScopes = (data: unknown): string[] => {
  if (Array.isArray(data)) {
    return data.filter((scope): scope is string => typeof scope === "string");
  }

  if (typeof data === "string") {
    return data.split(/\s+/).filter(Boolean);
  }

  return [];
};

export const authScopesQueryOptions = queryOptions({
  queryKey: ["auth-scopes"],
  queryFn: () =>
    authApiClient.get<unknown>(`/auth/@me/scopes`).then((res) => res.data),
  select: normalizeAuthScopes,
});

export const useAuthScopes = () => {
  const query = useQuery({
    ...authScopesQueryOptions,
  });

  return query;
};
