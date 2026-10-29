import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-characters-config";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";
import { useConfirmedCatchingCharacters } from "@/hooks/use-confirmed-catching-characters";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

const NO_GUILD_IDS: readonly string[] = [];

/**
 * The Lootlogs one character plays for, and the toggle that changes them.
 * The selection is the cached config itself: each toggle writes the next
 * list straight through the mutation, which updates the cache
 * optimistically and serializes rapid clicks, so a click never snaps back
 * when an earlier response lands.
 */
export const useCharacterCatchingSelection = (characterId: string) => {
  const { orderedGuilds: guilds } = useLootlogGuilds();
  const { confirm } = useConfirmedCatchingCharacters();

  const { data: charactersConfig, isPending: isConfigLoading } =
    useLootlogCharactersConfig();

  const { mutateFromCurrent, status } = useUpdateLootlogCharactersConfig();

  const selectedGuildIds =
    charactersConfig?.[characterId]?.catchingGuildIds ?? NO_GUILD_IDS;

  // Derived from the cache at click time, not from this render: a re-render
  // lags the cache by a tick, so the previous click of a rapid series would
  // otherwise be missing from the saved list.
  const toggle = (guildId: string) => {
    confirm(characterId);
    mutateFromCurrent((current) => {
      const currentGuildIds = current?.[characterId]?.catchingGuildIds ?? [];

      return {
        characterId,
        catchingGuildIds: currentGuildIds.includes(guildId)
          ? currentGuildIds.filter((id) => id !== guildId)
          : [...currentGuildIds, guildId],
      };
    });
  };

  return { guilds, selectedGuildIds, toggle, isConfigLoading, status };
};
