import { Permission } from 'src/guilds/enum/permission.type';

export function getGuildIdsWithTitansPermissions(guilds: any[]) {
  return guilds
    .filter((g) =>
      g.roles.some((role: any) =>
        role.permissions.includes(Permission.LOOTLOG_READ_TIMERS_TITANS),
      ),
    )
    .map((g) => `${g.guild.id}-titans`);
}
