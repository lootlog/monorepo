import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { resolveGuildTargets } from "@/lib/selected-lootlog-guild";

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
