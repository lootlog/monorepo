import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";

export const getColorFromRole = (roles: GuildMember["roles"]) => {
  const color = roles?.[0]?.color ?? 0;
  return color === 0 ? "FFF" : color?.toString(16).padStart(6, "0");
};
