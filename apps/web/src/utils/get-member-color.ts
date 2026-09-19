import { maxBy } from "es-toolkit";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";

type MemberRole = { position: number; color?: number | null };

/**
 * Resolves the CSS color of the member's highest-positioned Discord role.
 * Note: this deliberately differs from `getColorFromRole`, which reads the
 * first role in the list instead of the highest-positioned one.
 */
export const getMemberColor = (
  guildMember: { roles?: MemberRole[] } | undefined,
) => {
  const topRole = maxBy(guildMember?.roles ?? [], (role) => role.position);

  return getCustomRoleCssColor(topRole?.color) ?? "inherit";
};
