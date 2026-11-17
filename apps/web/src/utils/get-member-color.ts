import {
  discordRoleCssColor,
  getMemberDisplayRole,
} from "@lootlog/domain/member-display-role";

type MemberRole = { position?: number | null; color?: number | null };

/** The CSS colour of the member's Discord display role; without one the name keeps the text colour. */
export const getMemberColor = (
  guildMember: { roles?: readonly MemberRole[] | null } | undefined,
) =>
  discordRoleCssColor(getMemberDisplayRole(guildMember?.roles)?.color) ??
  "inherit";
