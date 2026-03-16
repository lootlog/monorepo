import type { GuildMember } from "discord.js";
import { isDiscordAdministrator } from "@lootlog/nest-shared";
import { MemberType } from "src/bot/enums/member-type.enum";

export const getMemberType = (member: GuildMember) => {
  const isAdministrativeUser = isDiscordAdministrator(
    Number(member.permissions.bitfield),
  );
  const isBot = member.user.bot;

  if (isBot) return MemberType.BOT;
  if (isAdministrativeUser) return MemberType.ADMIN;

  return MemberType.USER;
};
