import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { resolveGuildTargets } from "@/lib/selected-lootlog-guild";

/**
 * The Lootlogs a composer sends to right now; see `resolveGuildTargets`.
 * Empty until both the Lootlogs and the preferences that hide some of them
 * have loaded, so nothing is ever sent to a Lootlog the player has hidden.
 */
export const useGuildTargets = (selectedGuildIds: readonly string[]) => {
  const { areVisibleGuildsResolved, visibleGuilds } = useLootlogGuilds();
  const fallbackGuildId = useSelectedLootlogGuildId();

  if (!areVisibleGuildsResolved) return [];

  return resolveGuildTargets({
    selectedGuildIds,
    visibleGuilds,
    fallbackGuildId,
  });
};
