import {
  getAuthControllerGetScopesQueryKey,
  getAuthControllerGetScopesQueryOptions,
  useAuthControllerGetScopes,
} from "@/lib/api/generated/auth/auth/auth";

const normalizeAuthScopes = (data: unknown): string[] => {
  if (Array.isArray(data)) {
    return data.filter((scope): scope is string => typeof scope === "string");
  }

  if (typeof data === "string") {
    return data.split(/\s+/).filter(Boolean);
  }

  return [];
};

export const authScopesQueryOptions = () =>
  getAuthControllerGetScopesQueryOptions({
    query: {
      queryKey: getAuthControllerGetScopesQueryKey(),
      select: normalizeAuthScopes,
    },
  });

export const useAuthScopes = () => {
  const query = useAuthControllerGetScopes({
    query: {
      queryKey: getAuthControllerGetScopesQueryKey(),
      select: normalizeAuthScopes,
    },
  });

  return query;
};
