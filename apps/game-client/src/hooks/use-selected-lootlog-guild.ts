import { useEffect } from "react";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getPresenceClanKey } from "@/lib/presence-organization-selection";
import { getVisibleLootlogGuilds } from "@/lib/selected-lootlog-guild";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";

export function useCurrentCharacterId(): string | null {
  return useGameStore((state) => state.game?.hero.characterId ?? null);
}

export function useSelectedLootlogGuildId(): string | undefined {
  const characterId = useCurrentCharacterId();

  return useSettingsStore((state) =>
    characterId ? state.guildIdByCharId[characterId] : undefined,
  );
}

export function useSelectedLootlogGuildInitialization(): void {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const characterId = useCurrentCharacterId();
  const currentClanKey = useGameStore((state) => {
    const game = state.game;
    return game?.hero.clan
      ? getPresenceClanKey(game.world, game.hero.clan.id)
      : undefined;
  });
  const queryEnabled = gameInitialized && Boolean(characterId);
  const { data: guilds, isFetched: areGuildsFetched } =
    useUsersControllerGetCurrentUserAccessibleGuilds({
      query: {
        queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
        enabled: queryEnabled,
      },
    });
  const { data: userPreferences, isFetched: areUserPreferencesFetched } =
    useUserPreferences(queryEnabled);
  const ensureGuildId = useSettingsStore((state) => state.ensureGuildId);

  useEffect(() => {
    if (
      !queryEnabled ||
      !characterId ||
      !areGuildsFetched ||
      !areUserPreferencesFetched ||
      !guilds?.length
    ) {
      return;
    }

    const orderedGuildIds = getVisibleLootlogGuilds(
      guilds,
      userPreferences?.guildsOrder,
      userPreferences?.hiddenGuildIds,
    ).map((guild) => guild.id);
    ensureGuildId(characterId, orderedGuildIds, currentClanKey);
  }, [
    areGuildsFetched,
    areUserPreferencesFetched,
    characterId,
    currentClanKey,
    ensureGuildId,
    guilds,
    queryEnabled,
    userPreferences?.guildsOrder,
    userPreferences?.hiddenGuildIds,
  ]);
}
