import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";

type GetManageableUserGuildsParams = {
  skipConfigured: boolean;
  enabled?: boolean;
};

export type ManageableGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
};

export const useManageableGuilds = (params: GetManageableUserGuildsParams) => {
  const { client, isAuthenticated } = useApiClient();

  const query = useQuery({
    queryKey: ["manageable-guilds", params.skipConfigured],
    queryFn: () =>
      client.get<ManageableGuild[]>(
        `${API_URL}/users/@me/guilds/manageable?skipConfigured=${params.skipConfigured}`
      ),
    enabled: isAuthenticated && !!params.enabled,
    select: (response) => response.data,
  });

  return query;
};
