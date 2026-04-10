import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";
import { queryKeys } from "@/lib/query-keys";

type GuildsQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const guildsQueryOptions = ({
  suppressRouteErrorToast = false,
}: GuildsQueryOptionsOptions = {}) =>
  queryOptions({
    queryKey: queryKeys.guilds.user(),
    queryFn: () =>
      apiClient
        .get<Guild[]>(`/guilds/@me`, {
          suppressRouteErrorToast,
        } as ApiRequestConfig)
        .then((data) => data),
  });

export const useGuilds = () => {
  const query = useQuery({
    ...guildsQueryOptions(),
  });

  return query;
};
