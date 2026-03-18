import { Permission } from "@lootlog/types";
import type { UserGuildData, GuildRole } from "src/guilds/types/guild.types";

export function getGuildIdsWithTitansPermissions(guilds: UserGuildData[]) {
  return guilds
    .filter((g) =>
      g.roles.some((role: GuildRole) =>
        role.permissions.includes(Permission.LOOTLOG_TIMERS_TITANS_READ),
      ),
    )
    .map((g) => `${g.guild.id}-titans`);
}
