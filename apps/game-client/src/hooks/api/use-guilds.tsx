import { useQuery } from "@tanstack/react-query";
import { Guild } from "@/hooks/api/use-guild";
import { API_URL } from "@/config/api";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export const useGuilds = () => {
  const { client, hasToken } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["user-guilds"],
    queryFn: () =>
      client.get<Guild[]>(`${API_URL}/guilds/@me`, { withCredentials: true }),
    select: (response) => response.data,
    enabled: hasToken,
    refetchOnMount: false,
  });

  return query;
};
