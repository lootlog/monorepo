import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-characters-config";
import { useUpdateLootlogCharactersConfig } from "@/hooks/api/use-update-lootlog-characters-config";
import { useConfirmedCatchingCharacters } from "@/hooks/use-confirmed-catching-characters";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

const NO_GUILD_IDS: readonly string[] = [];

export const useCharacterCatchingSelection = (characterId: string) => {
  const { orderedGuilds: guilds } = useLootlogGuilds();
  const { confirm } = useConfirmedCatchingCharacters();

  const { data: charactersConfig, isPending: isConfigLoading } =
    useLootlogCharactersConfig();

  const { mutateFromCurrent } = useUpdateLootlogCharactersConfig();

  const selectedGuildIds =
    charactersConfig?.[characterId]?.catchingGuildIds ?? NO_GUILD_IDS;

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

  return { guilds, selectedGuildIds, toggle, isConfigLoading };
};
