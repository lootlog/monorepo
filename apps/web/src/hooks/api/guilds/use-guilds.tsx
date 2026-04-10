import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";

type GuildsQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const guildsQueryOptions = ({
  suppressRouteErrorToast = false,
}: GuildsQueryOptionsOptions = {}) =>
  queryOptions({
    queryKey: ["user-guilds"],
    queryFn: () =>
      apiClient
        .get<Guild[]>(`/guilds/@me`, {
          suppressRouteErrorToast,
        } as ApiRequestConfig)
        .then((res) => res.data),
  });

export const useGuilds = () => {
  const query = useQuery({
    ...guildsQueryOptions(),
  });

  return query;
};
