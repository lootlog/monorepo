import type { UserGuildData } from "../../guilds/types/guild.types.js";

export function getGuildIds(guilds: UserGuildData[]) {
  return guilds.map((g) => g.guild.id);
}
