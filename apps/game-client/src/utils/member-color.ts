import { discordRoleColorHex } from "@lootlog/domain/member-display-role";

export const getMemberColorHex = (
  guildMember: { color?: number | null } | undefined,
) => discordRoleColorHex(guildMember?.color) ?? "FFF";
