export const getDiscordAvatarUrl = (
  userId?: string,
  avatar?: string | null | undefined,
  size: number = 128
): string => {
  if (!userId) {
    return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
  }

  if (!avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
  }

  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}?size=${size}`;
};
