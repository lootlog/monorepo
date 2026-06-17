import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";

export const getColorFromRoleColor = (color: number | null | undefined) => {
  return color === 0 || color == null
    ? "FFF"
    : color.toString(16).padStart(6, "0");
};

export const getColorFromRole = (roles: GuildMember["roles"]) => {
  return getColorFromRoleColor(roles?.[0]?.color);
};
