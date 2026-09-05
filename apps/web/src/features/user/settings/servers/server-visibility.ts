type GuildIdentity = {
  id: string;
  name: string;
};

export const filterGuildsByVisibility = <Guild extends GuildIdentity>(
  guilds: Guild[],
  hiddenGuildIds: string[],
  visibility: "all" | "visible" | "hidden",
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
