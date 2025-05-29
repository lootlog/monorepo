import { useDiscordIdpToken } from "hooks/api/use-discord-idp-token";
import { REST, RESTOptions } from "@discordjs/rest";
import { useQuery } from "@tanstack/react-query";
import { Routes } from "discord-api-types/v10";

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
  const { data: token } = useDiscordIdpToken();

  const restClient = new REST({
    version: "10",
    authPrefix: "Bearer",
  } as RESTOptions);

  restClient.setToken(token!);

  const query = useQuery({
    queryKey: ["manageable-guilds"],
    queryFn: () =>
      restClient.get(Routes.userGuilds()) as Promise<ManageableGuild[]>,
    enabled: !!token && params.enabled,
    select: (response) =>
      response.filter((guild) => parseInt(guild.permissions, 10) & 0x8),
  });

  return query;
};
