import {
  discordRoleCssColor,
  getMemberDisplayRole,
} from "@lootlog/domain/member-display-role";

type MemberRole = { position?: number | null; color?: number | null };

export const getMemberColor = (
  guildMember: { roles?: readonly MemberRole[] | null } | undefined,
) =>
  discordRoleCssColor(getMemberDisplayRole(guildMember?.roles)?.color) ??
  "inherit";
