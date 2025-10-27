import { useQuery, queryOptions } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { apiClient } from "@/lib/api-client/api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";

export const guildsQueryOptions = queryOptions({
  queryKey: ["user-guilds"],
  queryFn: () => apiClient.get<Guild[]>(`/guilds/@me`).then((res) => res.data),
});

export const useGuilds = () => {
  useApiClient();

  const query = useQuery({
    ...guildsQueryOptions,
  });

  return query;
};
