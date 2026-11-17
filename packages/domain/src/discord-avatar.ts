const DISCORD_CDN_URL = "https://cdn.discordapp.com";

/**
 * Where a Discord user's avatar is served. A user without an avatar gets one
 * of Discord's five default avatars, chosen by their id.
 */
export const getDiscordAvatarUrl = (
  userId?: string,
  avatar?: string | null,
  size = 128,
): string => {
  if (avatar?.startsWith("http")) return avatar;

  if (!userId) return `${DISCORD_CDN_URL}/embed/avatars/0.png`;

  if (!avatar)
    return `${DISCORD_CDN_URL}/embed/avatars/${Number(userId) % 5}.png`;

  return `${DISCORD_CDN_URL}/avatars/${userId}/${avatar}?size=${size}`;
};
