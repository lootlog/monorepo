export const getGuildIconById = (guildId: string, iconId: string | null) => {
  return iconId
    ? `https://cdn.discordapp.com/icons/${guildId}/${iconId}.webp`
    : undefined;
};
