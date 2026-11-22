import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";
import { findGuildByRouteId } from "@/lib/current-user-guilds";

export const useCurrentUserGuild = (guildId: string | undefined) => {
  const { data: guilds } = useUsersControllerGetCurrentUserGuilds();

  return findGuildByRouteId(guilds, guildId);
};
