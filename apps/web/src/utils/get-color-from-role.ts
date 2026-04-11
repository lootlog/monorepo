import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { colorIntToHex } from "./color-to-hex";

export const getColorFromRole = (roles: GuildMember["roles"]) => {
  const color = roles[0]?.color;
  return color !== undefined ? colorIntToHex(color) : undefined;
};
