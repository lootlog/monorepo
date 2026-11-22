const DISCORD_CDN_URL = "https://cdn.discordapp.com";

const imageExtension = (hash: string) =>
  hash.startsWith("a_") ? "gif" : "webp";

export const getDiscordServerAvatarUrl = (
  guildId: string,
  userId: string,
  avatar: string,
): string =>
  `${DISCORD_CDN_URL}/guilds/${guildId}/users/${userId}/avatars/${avatar}.${imageExtension(avatar)}`;

export const getDiscordServerBannerUrl = (
  guildId: string,
  userId: string,
  banner: string,
  size = 480,
): string =>
  `${DISCORD_CDN_URL}/guilds/${guildId}/users/${userId}/banners/${banner}.${imageExtension(banner)}?size=${size}`;

export const getDiscordAvatarUrl = (
  userId?: string,
  avatar?: string | null,
  size = 128,
): string => {
  if (avatar?.startsWith("http"))
    return avatar.startsWith(`${DISCORD_CDN_URL}/`) && !avatar.includes("?")
      ? `${avatar}?size=${size}`
      : avatar;

  if (!userId) return `${DISCORD_CDN_URL}/embed/avatars/0.png`;

  if (!avatar)
    return `${DISCORD_CDN_URL}/embed/avatars/${Number(userId) % 5}.png`;

  return `${DISCORD_CDN_URL}/avatars/${userId}/${avatar}?size=${size}`;
};
