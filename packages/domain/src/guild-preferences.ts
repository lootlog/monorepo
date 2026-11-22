type GuildIdentity = {
  id: string;
  name: string;
};

export const GUILD_VISIBILITY_FILTERS = ["all", "visible", "hidden"] as const;

export type GuildVisibilityFilter = (typeof GUILD_VISIBILITY_FILTERS)[number];

export const filterGuildsByVisibility = <Guild extends GuildIdentity>(
  guilds: Guild[],
  hiddenGuildIds: string[],
  visibility: GuildVisibilityFilter,
  query: string,
): Guild[] => {
  const hiddenGuildIdSet = new Set(hiddenGuildIds);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return guilds.filter((guild) => {
    const isHidden = hiddenGuildIdSet.has(guild.id);

    if (visibility === "visible" && isHidden) {
      return false;
    }

    if (visibility === "hidden" && !isHidden) {
      return false;
    }

    return guild.name.toLocaleLowerCase().includes(normalizedQuery);
  });
};

export const toggleHiddenGuild = (
  hiddenGuildIds: readonly string[],
  guildId: string,
): string[] =>
  hiddenGuildIds.includes(guildId)
    ? hiddenGuildIds.filter((hiddenGuildId) => hiddenGuildId !== guildId)
    : [...hiddenGuildIds, guildId];

export const showAllGuilds = (
  hiddenGuildIds: readonly string[],
  accessibleGuildIds: ReadonlySet<string>,
): string[] =>
  hiddenGuildIds.filter(
    (hiddenGuildId) => !accessibleGuildIds.has(hiddenGuildId),
  );

export const orderGuilds = <Guild extends GuildIdentity>(
  guilds: Guild[],
  guildsOrder: string[] = [],
): Guild[] => {
  if (!guildsOrder?.length) {
    return guilds;
  }

  const guildsById = new Map(guilds.map((guild) => [guild.id, guild] as const));
  const orderedGuilds: Guild[] = [];

  for (const guildId of guildsOrder) {
    const guild = guildsById.get(guildId);

    if (guild !== undefined) orderedGuilds.push(guild);
  }

  const orderedGuildIds = new Set(orderedGuilds.map((guild) => guild.id));

  return [
    ...orderedGuilds,
    ...guilds.filter((guild) => !orderedGuildIds.has(guild.id)),
  ];
};
