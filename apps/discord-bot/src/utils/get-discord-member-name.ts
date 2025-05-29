import { GuildMember } from 'discord.js';

export const getDiscordMemberName = (member: GuildMember): string => {
  return (
    member.displayName ||
    member.user.globalName ||
    `${member.user.username}${member.user.discriminator !== '0' ? `#${member.user.discriminator}` : ''}`
  );
};
