import { useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  authApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

const normalizeAuthScopes = (data: unknown): string[] => {
  if (Array.isArray(data)) {
    return data.filter((scope): scope is string => typeof scope === "string");
  }

  if (typeof data === "string") {
    return data.split(/\s+/).filter(Boolean);
  }

  return [];
};

type AuthScopesQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const authScopesQueryOptions = ({
  suppressRouteErrorToast = false,
}: AuthScopesQueryOptionsOptions = {}) =>
  queryOptions({
    queryKey: queryKeys.auth.scopes(),
    queryFn: () =>
      authApiClient
        .get<unknown>(`/auth/@me/scopes`, {
          suppressRouteErrorToast,
        } as ApiRequestConfig)
        .then((data) => data),
    select: normalizeAuthScopes,
  });

export const useAuthScopes = () => {
  const query = useQuery({
    ...authScopesQueryOptions(),
  });

  return query;
};
