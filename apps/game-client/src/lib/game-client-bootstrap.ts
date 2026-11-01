import {
  hashKey,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  getCharacterAurasControllerGetAurasQueryKey,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  usersControllerGetGameClientBootstrap,
} from "@lootlog/client/main";
import {
  decodeGuildSettingsDocuments,
  decodeSettingsDocuments,
  getGuildTimersDocumentsQueryKey,
  getSettingsDocumentsQueryKey,
} from "@/features/settings/persistence/settings-documents";
import { getGuildIds } from "@/lib/api/generated-helpers";
import { applyGameOrganizationAccess } from "@/lib/game-access-cache";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";

type Bootstrap = {
  settled: boolean;
  readonly parts: Promise<ReadonlyMap<string, unknown>>;
};

let current: Bootstrap | undefined;

/** The character the startup queries are keyed by, once the game has one. */
const waitForCharacter = (signal: AbortSignal) =>
  new Promise<{ accountId: string; characterId: string }>((resolve, reject) => {
    const read = () => {
      const hero = useGameStore.getState().game?.hero;

      return useGlobalStore.getState().gameState.gameInitialized && hero
        ? { accountId: hero.accountId, characterId: hero.characterId }
        : undefined;
    };

    const ready = read();

    if (ready) return resolve(ready);

    const stop = () => {
      unsubscribeGame();
      unsubscribeGlobal();
      signal.removeEventListener("abort", abort);
    };

    const check = () => {
      const character = read();

      if (!character) return;
      stop();
      resolve(character);
    };

    const abort = () => {
      stop();
      reject(signal.reason);
    };

    const unsubscribeGame = useGameStore.subscribe(check);
    const unsubscribeGlobal = useGlobalStore.subscribe(check);
    signal.addEventListener("abort", abort);
  });

// The startup queries wait for this one request, so a hung request must
// fail into their own fetches instead of holding all of them.
const BOOTSTRAP_REQUEST_TIMEOUT_MS = 10_000;

const load = async (queryClient: QueryClient, signal: AbortSignal) => {
  const { accountId, characterId } = await waitForCharacter(signal);

  const response = await usersControllerGetGameClientBootstrap(
    { gameAccountId: accountId, characterId },
    { signal, apiClient: { timeoutMs: BOOTSTRAP_REQUEST_TIMEOUT_MS } },
  );

  const parts = new Map<string, unknown>();

  const seed = <T>(queryKey: QueryKey, data: T, cached: T = data) => {
    parts.set(hashKey(queryKey), data);

    // Data already cached was written after the request left, by a save
    // or a fetch of its own, so it is not replaced by the older answer.
    if (queryClient.getQueryData(queryKey) === undefined)
      queryClient.setQueryData(queryKey, cached);
  };

  if (response.accessibleGuilds) {
    const guilds = applyGameOrganizationAccess(
      queryClient,
      response.accessibleGuilds,
    );

    // A waiting query applies the access policy itself, as it does to its
    // own response; the cache gets the guilds that policy allows.
    seed(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      response.accessibleGuilds,
      guilds,
    );

    const guildIds = getGuildIds(guilds);

    if (response.guildTimerDocuments && guildIds.length > 0)
      seed(
        getGuildTimersDocumentsQueryKey(guildIds),
        decodeGuildSettingsDocuments(response.guildTimerDocuments),
      );
  }

  if (response.userPreferences)
    seed(
      getUsersControllerGetUserPreferencesQueryKey(),
      response.userPreferences,
    );

  if (response.lootlogConfig)
    seed(
      getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
        accountId,
      }),
      response.lootlogConfig,
    );

  if (response.characterAura)
    seed(
      getCharacterAurasControllerGetOwnAuraQueryKey(),
      response.characterAura,
    );

  if (response.characterAuras)
    seed(
      getCharacterAurasControllerGetAurasQueryKey(),
      response.characterAuras,
    );

  if (response.settingsDocuments)
    seed(
      getSettingsDocumentsQueryKey({ gameAccountId: accountId, characterId }),
      decodeSettingsDocuments(response.settingsDocuments),
    );

  return parts;
};

/**
 * Answers the game client's startup reads with one request. Until it
 * settles, those queries wait for it instead of fetching; a part it could not
 * read, or a failed request, leaves them to fetch from their own endpoints.
 * Returns the cleanup for the tree that started it.
 */
export const startGameClientBootstrap = (queryClient: QueryClient) => {
  const controller = new AbortController();

  const bootstrap: Bootstrap = {
    settled: false,
    parts: load(queryClient, controller.signal)
      .catch((): ReadonlyMap<string, unknown> => new Map())
      .finally(() => {
        bootstrap.settled = true;
      }),
  };

  current = bootstrap;

  return () => {
    controller.abort();

    if (current === bootstrap) current = undefined;
  };
};

/**
 * The startup answer for a query that started before the bootstrap settled,
 * or undefined when the query has to fetch it from its own endpoint.
 */
export const readGameClientBootstrap = async <T>(
  queryKey: QueryKey,
): Promise<T | undefined> => {
  const bootstrap = current;

  if (!bootstrap || bootstrap.settled) return undefined;

  // SAFETY: each part is stored under the key of the query whose response
  // it is, already in the shape that query caches.
  return (await bootstrap.parts).get(hashKey(queryKey)) as T | undefined;
};
