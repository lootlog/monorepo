import {
  hashKey,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  getCharacterAurasControllerGetAurasQueryKey,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  usersControllerGetGameClientBootstrap,
} from "@lootlog/client/main";
import {
  decodeGuildSettingsDocuments,
  decodeSettingsDocuments,
  type GuildSettingsDocuments,
  type SettingsDocuments,
  getGuildTimersDocumentsQueryKey,
  getSettingsDocumentsQueryKey,
} from "@/lib/settings-persistence/settings-documents";
import { getGuildIds } from "@/lib/api/generated-helpers";
import { applyGameOrganizationAccess } from "@/lib/game-access-cache";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";

type BootstrapResponse = Awaited<
  ReturnType<typeof usersControllerGetGameClientBootstrap>
>;

type BootstrapPartData = {
  accessibleGuilds: NonNullable<BootstrapResponse["accessibleGuilds"]>;
  guildTimerDocuments: GuildSettingsDocuments;
  guildPermissions: NonNullable<BootstrapResponse["guildPermissions"]>[string];
  userPreferences: NonNullable<BootstrapResponse["userPreferences"]>;
  lootlogConfig: NonNullable<BootstrapResponse["lootlogConfig"]>;
  characterAura: NonNullable<BootstrapResponse["characterAura"]>;
  characterAuras: NonNullable<BootstrapResponse["characterAuras"]>;
  settingsDocuments: SettingsDocuments;
};

type BootstrapPart = keyof BootstrapPartData;

type BootstrapParts = {
  readonly [Part in BootstrapPart]: Map<string, BootstrapPartData[Part]>;
};

const createBootstrapParts = (): BootstrapParts => ({
  accessibleGuilds: new Map(),
  guildTimerDocuments: new Map(),
  guildPermissions: new Map(),
  userPreferences: new Map(),
  lootlogConfig: new Map(),
  characterAura: new Map(),
  characterAuras: new Map(),
  settingsDocuments: new Map(),
});

type Bootstrap = {
  settled: boolean;
  readonly parts: Promise<BootstrapParts>;
};

let current: Bootstrap | undefined;

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

const BOOTSTRAP_REQUEST_TIMEOUT_MS = 10_000;

const load = async (queryClient: QueryClient, signal: AbortSignal) => {
  const { accountId, characterId } = await waitForCharacter(signal);

  const response = await usersControllerGetGameClientBootstrap(
    { gameAccountId: accountId, characterId },
    { signal, apiClient: { timeoutMs: BOOTSTRAP_REQUEST_TIMEOUT_MS } },
  );

  const parts = createBootstrapParts();

  const seed = <Part extends BootstrapPart>(
    part: Part,
    queryKey: QueryKey,
    data: BootstrapPartData[Part],
    cached: BootstrapPartData[Part] = data,
  ) => {
    parts[part].set(hashKey(queryKey), data);

    if (queryClient.getQueryData(queryKey) === undefined)
      queryClient.setQueryData(queryKey, cached);
  };

  if (response.accessibleGuilds) {
    const guilds = applyGameOrganizationAccess(
      queryClient,
      response.accessibleGuilds,
    );

    seed(
      "accessibleGuilds",
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      response.accessibleGuilds,
      guilds,
    );

    const guildIds = getGuildIds(guilds);

    if (response.guildTimerDocuments && guildIds.length > 0)
      seed(
        "guildTimerDocuments",
        getGuildTimersDocumentsQueryKey(guildIds),
        decodeGuildSettingsDocuments(response.guildTimerDocuments),
      );
  }

  if (response.guildPermissions)
    for (const [guildId, capabilities] of Object.entries(
      response.guildPermissions,
    ))
      seed(
        "guildPermissions",
        getGuildsControllerGetGuildPermissionsQueryKey({ guildId }),
        capabilities,
      );

  if (response.userPreferences)
    seed(
      "userPreferences",
      getUsersControllerGetUserPreferencesQueryKey(),
      response.userPreferences,
    );

  if (response.lootlogConfig)
    seed(
      "lootlogConfig",
      getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
        accountId,
      }),
      response.lootlogConfig,
    );

  if (response.characterAura)
    seed(
      "characterAura",
      getCharacterAurasControllerGetOwnAuraQueryKey(),
      response.characterAura,
    );

  if (response.characterAuras)
    seed(
      "characterAuras",
      getCharacterAurasControllerGetAurasQueryKey(),
      response.characterAuras,
    );

  if (response.settingsDocuments)
    seed(
      "settingsDocuments",
      getSettingsDocumentsQueryKey({ gameAccountId: accountId, characterId }),
      decodeSettingsDocuments(response.settingsDocuments),
    );

  return parts;
};

export const startGameClientBootstrap = (queryClient: QueryClient) => {
  const controller = new AbortController();

  const bootstrap: Bootstrap = {
    settled: false,
    parts: load(queryClient, controller.signal)
      .catch(createBootstrapParts)
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

export const readGameClientBootstrap = async <Part extends BootstrapPart>(
  part: Part,
  queryKey: QueryKey,
): Promise<BootstrapPartData[Part] | undefined> => {
  const bootstrap = current;

  if (!bootstrap || bootstrap.settled) return undefined;

  return (await bootstrap.parts)[part].get(hashKey(queryKey));
};
