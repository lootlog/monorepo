import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerGetGuildPreferences,
  settingsDocumentsControllerGetPreferences,
} from "@lootlog/client/main";
import { useQuery } from "@tanstack/react-query";
import {
  decodeSettingsDocuments,
  decodeGuildSettingsDocuments,
  getGuildTimersDocumentsParams,
  getGuildTimersDocumentsQueryKey,
  getSettingsDocumentsParams,
  type GuildSettingsDocuments,
  type SettingsDocuments,
} from "./settings-documents";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

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
  const queryKey = getSettingsDocumentsControllerGetPreferencesQueryKey(params);

  return useQuery({
    queryFn: async ({ signal }) =>
      (await readGameClientBootstrap<SettingsDocuments>(queryKey)) ??
      decodeSettingsDocuments(
        await settingsDocumentsControllerGetPreferences(params, { signal }),
      ),
    queryKey,
    enabled: gameInitialized,
    ...QUERY_OPTIONS,
  });
};

/** Timer documents (hidden and pinned timers) of the given guilds, in one request. */
export const useGuildTimersDocuments = (guildIds: readonly string[]) => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  const params = getGuildTimersDocumentsParams(guildIds);
  const queryKey = getGuildTimersDocumentsQueryKey(guildIds);

  return useQuery({
    queryKey,
    queryFn: async ({ signal }): Promise<GuildSettingsDocuments> =>
      (await readGameClientBootstrap<GuildSettingsDocuments>(queryKey)) ??
      decodeGuildSettingsDocuments(
        await settingsDocumentsControllerGetGuildPreferences(params, {
          signal,
        }),
      ),
    enabled: gameInitialized && guildIds.length > 0,
    ...QUERY_OPTIONS,
  });
};
