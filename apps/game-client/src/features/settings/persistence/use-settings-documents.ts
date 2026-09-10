import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerGetPreferences,
  useSettingsDocumentsControllerGetPreferences,
} from "@lootlog/client/main";
import { useQueries } from "@tanstack/react-query";
import {
  getGuildTimersDocumentsParams,
  getSettingsDocumentsParams,
  type SettingsDocuments,
} from "./settings-documents";

const QUERY_OPTIONS = {
  staleTime: 60_000,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  retry: false,
} as const;

export const useSettingsDocumentsContext = () => {
  const gameAccountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);

  return { gameAccountId, characterId };
};

/** The resolved settings documents for the signed-in user and current character. */
export const useSettingsDocuments = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  const params = getSettingsDocumentsParams(useSettingsDocumentsContext());

  return useSettingsDocumentsControllerGetPreferences(params, {
    query: {
      queryKey: getSettingsDocumentsControllerGetPreferencesQueryKey(params),
      enabled: gameInitialized,
      ...QUERY_OPTIONS,
    },
  });
};

/** Guild-scoped timer documents (hidden and pinned timers) for the given guilds. */
export const useGuildTimersDocuments = (guildIds: readonly string[]) => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  return useQueries({
    queries: guildIds.map((guildId) => {
      const params = getGuildTimersDocumentsParams(guildId);

      return {
        queryKey: getSettingsDocumentsControllerGetPreferencesQueryKey(params),
        queryFn: (): Promise<SettingsDocuments> =>
          settingsDocumentsControllerGetPreferences(params),
        enabled: gameInitialized,
        ...QUERY_OPTIONS,
      };
    }),
  });
};
