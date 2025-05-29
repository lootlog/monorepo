import { GuildMember } from 'discord.js';
import { MemberType } from 'src/bot/enums/member-type.enum';

export const getMemberType = (member: GuildMember) => {
  const isAdministrativeUser =
    (Number(member.permissions.bitfield) & 0x8) === 0x8;
  const isBot = member.user.bot;

  if (isBot) return MemberType.BOT;
  if (isAdministrativeUser) return MemberType.ADMIN;

  return MemberType.USER;
};
