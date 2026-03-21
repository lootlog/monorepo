import { Permission } from "@lootlog/types";
import type { UserGuildData } from "src/guilds/types/guild.types";

export function getGuildIdsWithTitansPermissions(guilds: UserGuildData[]) {
  return guilds
    .filter((guildData) =>
      guildData.roles.some((role) =>
        role.permissions.includes(Permission.LOOTLOG_TIMERS_TITANS_READ),
      ),
    )
    .map((guildData) => `${guildData.guild.id}-titans`);
}
