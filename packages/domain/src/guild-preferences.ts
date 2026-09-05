type GuildIdentity = {
  id: string;
  name: string;
};

export const orderGuilds = <Guild extends GuildIdentity>(
  guilds: Guild[],
  guildsOrder: string[] = [],
): Guild[] => {
  if (!guildsOrder?.length) {
    return guilds;
  }

  const guildsById = new Map(guilds.map((guild) => [guild.id, guild] as const));
  const orderedGuilds = guildsOrder
    .map((guildId) => guildsById.get(guildId))
    .filter((guild): guild is Guild => guild !== undefined);
  const orderedGuildIds = new Set(orderedGuilds.map((guild) => guild.id));

  return [
    ...orderedGuilds,
    ...guilds.filter((guild) => !orderedGuildIds.has(guild.id)),
  ];
};
