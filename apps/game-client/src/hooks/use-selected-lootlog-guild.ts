import { useEffect, useSyncExternalStore } from "react";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { gameEventsManager } from "@/lib/game-events-manager";
import {
  getCurrentCharacterId,
  orderLootlogGuilds,
} from "@/lib/selected-lootlog-guild";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";

const subscribeToCurrentCharacter = (onStoreChange: () => void) =>
  gameEventsManager.subscribeAfterGameEvent(onStoreChange);

export function useCurrentCharacterId(): string | null {
  return useSyncExternalStore(
    subscribeToCurrentCharacter,
    getCurrentCharacterId,
    getCurrentCharacterId,
  );
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

    const orderedGuildIds = orderLootlogGuilds(
      guilds,
      userPreferences?.guildsOrder,
    ).map((guild) => guild.id);
    ensureGuildId(characterId, orderedGuildIds);
  }, [
    areGuildsFetched,
    areUserPreferencesFetched,
    characterId,
    ensureGuildId,
    guilds,
    queryEnabled,
    userPreferences?.guildsOrder,
  ]);
}
