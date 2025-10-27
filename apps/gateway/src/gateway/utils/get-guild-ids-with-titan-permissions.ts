import { Permission } from 'src/guilds/enum/permission.type';
import type { UserGuildData, GuildRole } from 'src/guilds/types/guild.types';

export function getGuildIdsWithTitansPermissions(guilds: UserGuildData[]) {
  return guilds
    .filter((g) =>
      g.roles.some((role: GuildRole) =>
        role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS),
      ),
    )
    .map((g) => `${g.guild.id}-titans`);
}
