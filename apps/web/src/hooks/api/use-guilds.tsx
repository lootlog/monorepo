import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";
import { Guild } from "hooks/api/use-guild";

export const useGuilds = () => {
  const { client, isAuthenticated } = useApiClient();

  const query = useQuery({
    queryKey: ["user-guilds"],
    queryFn: () => client.get<Guild[]>(`${API_URL}/users/@me/guilds`),
    enabled: isAuthenticated,
    select: (response) => response.data,
  });

  return query;
};
