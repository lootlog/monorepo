import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";

/**
 * The server-rail entry for an Organization route, matched by id or vanity
 * URL. It is known even when the member has no Lootlog access to it.
 */
export const useCurrentUserGuild = (guildId: string | undefined) => {
  const { data: guilds } = useUsersControllerGetCurrentUserGuilds();

  return guilds?.find(
    (guild) => guild.id === guildId || guild.vanityUrl === guildId,
  );
};
