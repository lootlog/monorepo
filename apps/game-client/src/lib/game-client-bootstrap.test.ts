import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import {
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
