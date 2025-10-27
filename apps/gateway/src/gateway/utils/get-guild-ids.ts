import type { UserGuildData } from 'src/guilds/types/guild.types';

export function getGuildIds(guilds: UserGuildData[]) {
  return guilds.map((g) => g.guild.id);
}
