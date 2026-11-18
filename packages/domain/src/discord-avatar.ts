const DISCORD_CDN_URL = "https://cdn.discordapp.com";

/** Discord serves an animated image only under the `gif` extension. */
const imageExtension = (hash: string) =>
  hash.startsWith("a_") ? "gif" : "webp";

/**
 * Where a member's per-server avatar is served. Unlike a user's own avatar it
 * cannot be rebuilt from the user id and hash alone, so a Member stores this
 * address in place of the hash.
 */
export const getDiscordServerAvatarUrl = (
  guildId: string,
  userId: string,
  avatar: string,
): string =>
  `${DISCORD_CDN_URL}/guilds/${guildId}/users/${userId}/avatars/${avatar}.${imageExtension(avatar)}`;

/** Where a member's per-server banner is served. */
export const getDiscordServerBannerUrl = (
  guildId: string,
  userId: string,
  banner: string,
  size = 480,
): string =>
  `${DISCORD_CDN_URL}/guilds/${guildId}/users/${userId}/banners/${banner}.${imageExtension(banner)}?size=${size}`;

/**
 * Where a Discord user's avatar is served: `avatar` is the user's avatar hash
 * or the address of a per-server avatar. A user without an avatar gets one of
 * Discord's five default avatars, chosen by their id.
 */
export const getDiscordAvatarUrl = (
  userId?: string,
  avatar?: string | null,
  size = 128,
): string => {
  if (avatar?.startsWith("http"))
    // The slash ends the host, so `cdn.discordapp.com.example` does not match.
    return avatar.startsWith(`${DISCORD_CDN_URL}/`) && !avatar.includes("?")
      ? `${avatar}?size=${size}`
      : avatar;

  if (!userId) return `${DISCORD_CDN_URL}/embed/avatars/0.png`;

  if (!avatar)
    return `${DISCORD_CDN_URL}/embed/avatars/${Number(userId) % 5}.png`;

  return `${DISCORD_CDN_URL}/avatars/${userId}/${avatar}?size=${size}`;
};
