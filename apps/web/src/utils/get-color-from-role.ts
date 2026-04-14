import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { formatDiscordColor } from "@/utils/format-discord-color";

export const getColorFromRole = (roles: GuildMember["roles"]) => {
  return formatDiscordColor(roles[0]?.color);
};
