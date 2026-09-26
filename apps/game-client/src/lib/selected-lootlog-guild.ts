import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { useGameStore } from "@/store/game.store";
import type { GuildIdentity } from "@/lib/api/generated-helpers";

export function getCurrentCharacterId(): string | null {
  try {
    const characterId = useGameStore.getState().game?.hero.characterId;

    if (characterId === undefined || characterId === null) {
      return null;
    }

    const normalizedCharacterId = String(characterId).trim();

    return normalizedCharacterId || null;
  } catch {
    return null;
  }
}

export function getVisibleLootlogGuilds(
  guilds: GuildIdentity[],
  guildsOrder?: string[],
  hiddenGuildIds: string[] = [],
): GuildIdentity[] {
  if (hiddenGuildIds.length === 0) {
    return orderLootlogGuilds(guilds, guildsOrder);
  }

  const hiddenGuildIdSet = new Set(hiddenGuildIds);

  return orderLootlogGuilds(guilds, guildsOrder).filter(
    (guild) => !hiddenGuildIdSet.has(guild.id),
  );
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

/**
 * The Lootlogs a multi-target composer sends to: the stored choice limited to
 * visible Lootlogs in their display order, or the character's selected
 * Lootlog when nothing stored is still visible, so a composer never sends to
 * a hidden or lost Lootlog and never starts without a target.
 */
export function resolveGuildTargets({
  selectedGuildIds,
  visibleGuilds,
  fallbackGuildId,
}: {
  selectedGuildIds: readonly string[];
  visibleGuilds: readonly Pick<GuildIdentity, "id">[];
  fallbackGuildId: string | undefined;
}): string[] {
  const selectedGuildIdSet = new Set(selectedGuildIds);

  const targetGuildIds = visibleGuilds.flatMap((guild) =>
    selectedGuildIdSet.has(guild.id) ? [guild.id] : [],
  );

  if (targetGuildIds.length > 0) return targetGuildIds;

  const fallbackGuild =
    visibleGuilds.find((guild) => guild.id === fallbackGuildId) ??
    visibleGuilds[0];

  return fallbackGuild ? [fallbackGuild.id] : [];
}

export const toggleAvailableGuild = (
  guilds: readonly Pick<GuildIdentity, "id">[],
  selectedGuildIds: readonly string[],
  guildId: string,
): string[] => {
  const nextGuildIds = selectedGuildIds.includes(guildId)
    ? selectedGuildIds.filter((id) => id !== guildId)
    : [...selectedGuildIds, guildId];

  const nextGuildIdSet = new Set(nextGuildIds);

  return guilds.flatMap((guild) =>
    nextGuildIdSet.has(guild.id) ? [guild.id] : [],
  );
};
