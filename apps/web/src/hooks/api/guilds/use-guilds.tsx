import { useQuery, queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client/api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";
import { queryKeys } from "@/lib/query-keys";

export const guildsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.guilds.user(),
    queryFn: () => apiClient.get<Guild[]>(`/guilds/@me`),
  });

export const useGuilds = () => {
  const query = useQuery({
    ...guildsQueryOptions(),
  });

  return query;
};
