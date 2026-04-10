import { useQuery, queryOptions } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import { useSession } from "@/hooks/auth/use-session";
import { queryKeys } from "@/lib/query-keys";

export type UserPreferences = {
  id: number;
  userId: string;
  guildsOrder: string[];
  theme?: string;
  colorMode?: string;
  createdAt: string;
  updatedAt: string;
};

type UserPreferencesQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const userPreferencesQueryOptions = ({
  suppressRouteErrorToast = false,
}: UserPreferencesQueryOptionsOptions = {}) =>
  queryOptions({
    queryKey: queryKeys.user.preferences(),
    queryFn: () =>
      apiClient
        .get<UserPreferences>("/users/@me/preferences", {
          suppressRouteErrorToast,
        } as ApiRequestConfig)
        .then((data) => data),
    retry: 1,
  });

export const useUserPreferences = () => {
  useApiClient();
  const { data: session } = useSession();

  const query = useQuery({
    ...userPreferencesQueryOptions(),
    enabled: !!session?.user,
  });

  return query;
};
