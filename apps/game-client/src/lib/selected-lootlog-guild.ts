import { Game } from "@/lib/game";
import type { GuildIdentity } from "@/lib/api/generated-helpers";

export function getCurrentCharacterId(): string | null {
  try {
    const characterId = Game.hero?.id;
    if (characterId === undefined || characterId === null) {
      return null;
    }

    const normalizedCharacterId = String(characterId).trim();
    return normalizedCharacterId || null;
  } catch {
    return null;
  }
}

export function orderLootlogGuilds(
  guilds: GuildIdentity[],
  guildsOrder?: string[],
): GuildIdentity[] {
  if (!guildsOrder?.length) {
    return guilds;
  }

  const guildsById = new Map(guilds.map((guild) => [guild.id, guild] as const));
  const orderedGuilds = guildsOrder
    .map((guildId) => guildsById.get(guildId))
    .filter((guild): guild is GuildIdentity => guild !== undefined);
  const orderedGuildIds = new Set(orderedGuilds.map((guild) => guild.id));

  return [
    ...orderedGuilds,
    ...guilds.filter((guild) => !orderedGuildIds.has(guild.id)),
  ];
}

export function getSelectedLootlogGuildId(
  guildIdByCharId: Record<string, string | undefined>,
): string | undefined {
  const currentCharacterId = getCurrentCharacterId();
  if (!currentCharacterId) {
    return undefined;
  }

  return guildIdByCharId[currentCharacterId];
}

export function isConcreteLootlogGuildId(
  guildId: string | undefined,
): guildId is string {
  return Boolean(guildId) && guildId !== "all";
}
