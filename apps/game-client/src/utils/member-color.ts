import { discordRoleColorHex } from "@lootlog/domain/member-display-role";

/** The hex colour (without `#`) a member's name is drawn in; white without a role colour. */
export const getMemberColorHex = (
  guildMember: { color?: number | null } | undefined,
) => discordRoleColorHex(guildMember?.color) ?? "FFF";
