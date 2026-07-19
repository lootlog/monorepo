import { Game } from "@/lib/game";

export function getCurrentCharacterId(): string | null {
  try {
    return String(Game.hero.id);
  } catch {
    return null;
  }
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
