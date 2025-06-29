export function getGuildIds(guilds: any[]) {
  return guilds.map((g) => g.guild.id);
}
