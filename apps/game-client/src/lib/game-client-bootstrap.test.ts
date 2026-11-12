import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  readGameClientBootstrap,
  startGameClientBootstrap,
} from "./game-client-bootstrap";

const guild = {
  id: "guild-1",
  name: "Test guild",
  icon: null,
  vanityUrl: null,
  ownerId: "discord-1",
  publicStatsCardEnabled: false,
  hasLootlogAccess: true,
  isAccessDataStale: false,
};

afterEach(() => {
  useGameStore.setState({ game: null });
  useGlobalStore.setState({ gameState: { gameInitialized: false } });
});

it("leaves an unavailable part, and every later refetch, to the query's own endpoint", async () => {
  const requests: string[] = [];

  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(new URL(request.url).search);

        return Response.json({
          accessibleGuilds: [guild],
          userPreferences: null,
          lootlogConfig: null,
          settingsDocuments: null,
          guildTimerDocuments: null,
        });
      },
    },
  });

  const client = new QueryClient();
  const stop = startGameClientBootstrap(client);
  const guildsKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();
  const preferencesKey = getUsersControllerGetUserPreferencesQueryKey();

  try {
    // Queries mounted before the game starts wait for its character.
    const startup = Promise.all([
      readGameClientBootstrap(guildsKey),
      readGameClientBootstrap(preferencesKey),
    ]);

    setTestRuntimeGame({ hero: { accountId: "202", characterId: "7" } });
    useGlobalStore.setState({ gameState: { gameInitialized: true } });

    expect(await startup).toEqual([[guild], undefined]);
    expect(requests).toEqual(["?gameAccountId=202&characterId=7"]);
    expect(client.getQueryData(guildsKey)).toEqual([guild]);
    expect(client.getQueryData(preferencesKey)).toBeUndefined();
    // An invalidation after startup must read current data, not the bootstrap.
    expect(await readGameClientBootstrap(guildsKey)).toBeUndefined();
  } finally {
    stop();
    restore();
    client.clear();
  }
});

it("answers a guild's permissions query only for guilds the bootstrap read", async () => {
  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async () =>
        Response.json({
          accessibleGuilds: [guild, { ...guild, id: "guild-2" }],
          userPreferences: null,
          lootlogConfig: null,
          settingsDocuments: null,
          guildTimerDocuments: null,
          guildPermissions: { "guild-1": ["LOOTLOG_ACCESS"] },
        }),
    },
  });

  const client = new QueryClient();
  const stop = startGameClientBootstrap(client);

  const readKey = getGuildsControllerGetGuildPermissionsQueryKey({
    guildId: "guild-1",
  });

  const failedKey = getGuildsControllerGetGuildPermissionsQueryKey({
    guildId: "guild-2",
  });

  try {
    const startup = Promise.all([
      readGameClientBootstrap(readKey),
      readGameClientBootstrap(failedKey),
    ]);

    setTestRuntimeGame({ hero: { accountId: "202", characterId: "7" } });
    useGlobalStore.setState({ gameState: { gameInitialized: true } });

    expect(await startup).toEqual([["LOOTLOG_ACCESS"], undefined]);
    expect(client.getQueryData(failedKey)).toBeUndefined();
  } finally {
    stop();
    restore();
    client.clear();
  }
});
