import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { Guild } from "@/hooks/api/use-guild";
import { queryKeys } from "@/features/public-api/query-keys";

export const useGuilds = () => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: queryKeys.guilds(),
    queryFn: () =>
      client.get<Guild[]>(`${API_URL}/guilds/@me?source=game`, {
        withCredentials: true,
      }),
    select: (response) => response.data,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return query;
};
