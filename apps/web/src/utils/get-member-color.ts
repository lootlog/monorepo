import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";

type MemberRole = { position: number; color?: number | null };

/** Resolves the CSS color of the member's Discord display role. */
export const getMemberColor = (
  guildMember: { roles?: MemberRole[] } | undefined,
) =>
  getCustomRoleCssColor(getMemberDisplayRole(guildMember?.roles)?.color) ??
  "inherit";
