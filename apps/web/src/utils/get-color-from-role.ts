import { GuildMember } from "@/hooks/api/use-guild-member";

export const getColorFromRole = (roles: GuildMember["roles"]) => {
  const color = roles[0]?.color;
  return color === 0 ? "FFF" : color?.toString(16);
};
