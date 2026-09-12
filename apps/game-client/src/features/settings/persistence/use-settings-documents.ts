import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerGetGuildPreferences,
  useSettingsDocumentsControllerGetPreferences,
} from "@lootlog/client/main";
import { useQuery } from "@tanstack/react-query";
import {
  getGuildTimersDocumentsParams,
  getGuildTimersDocumentsQueryKey,
  getSettingsDocumentsParams,
  type GuildSettingsDocuments,
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

/** Timer documents (hidden and pinned timers) of the given guilds, in one request. */
export const useGuildTimersDocuments = (guildIds: readonly string[]) => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  const params = getGuildTimersDocumentsParams(guildIds);

  return useQuery({
    queryKey: getGuildTimersDocumentsQueryKey(guildIds),
    queryFn: (): Promise<GuildSettingsDocuments> =>
      settingsDocumentsControllerGetGuildPreferences(params),
    enabled: gameInitialized && guildIds.length > 0,
    ...QUERY_OPTIONS,
  });
};
