import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { resolveGuildTargets } from "@/lib/selected-lootlog-guild";

/** The Lootlogs a multi-target composer sends to right now; see `resolveGuildTargets`. */
export const useGuildTargets = (selectedGuildIds: readonly string[]) => {
  const { visibleGuilds } = useLootlogGuilds();
  const fallbackGuildId = useSelectedLootlogGuildId();

  return resolveGuildTargets({
    selectedGuildIds,
    visibleGuilds,
    fallbackGuildId,
  });
};
