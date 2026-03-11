import { Permission } from "@lootlog/types";
import type { UserGuildData, GuildRole } from "src/guilds/types/guild.types";

export function getGuildIdsWithHeroesPermissions(guilds: UserGuildData[]) {
  return guilds
    .filter((g) =>
      g.roles.some((role: GuildRole) =>
        role.permissions.includes(Permission.LOOTLOG_TIMERS_HEROES_READ),
      ),
    )
    .map((g) => `${g.guild.id}-heroes`);
}
