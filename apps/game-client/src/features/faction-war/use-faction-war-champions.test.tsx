import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it } from "vitest";
import { authClient } from "@/lib/auth-client";
import {
  configureGameClientPlatform,
  createGameRealtimeClient,
} from "@/lib/game-client-platform";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useFactionWarChampions } from "./use-faction-war-champions";

const CHAMPION_BY_WORLD = new Map([
  ["luvia", "100"],
  ["tempest", "200"],
]);

const SESSION = {
  user: {
    id: "user",
    name: "Member",
    email: "member@example.test",
    emailVerified: true,
    discordId: "1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  session: {
    id: "session",
    userId: "user",
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

afterEach(() => {
  useGameStore.setState({ game: null });
});

it("asks for the champions of the game's world only once the game names it", async () => {
  useGameStore.setState({ game: null });
  const worlds: (string | null)[] = [];

  const http: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));

    if (url.pathname.endsWith("/get-session")) return Response.json(SESSION);

    if (url.pathname !== "/faction-wars/champions")
      throw new Error(`Unexpected HTTP request: ${url.pathname}`);

    const world = url.searchParams.get("world");
    worlds.push(world);

    return Response.json({
      warId: "2026-barbatos-tanroth",
      champions: [
        {
          faction: "BARBATOS",
          characterIds: [CHAMPION_BY_WORLD.get(world ?? "") ?? "0"],
        },
      ],
    });
  };

  const restorePlatform = configureGameClientPlatform({
    fetch: http,
    createRealtime: createGameRealtimeClient,
  });

  const restoreApi = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch: http },
  });

  authClient.$store.notify("$sessionSignal");

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const { result, unmount } = renderHook(useFactionWarChampions, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  try {
    await waitFor(() =>
      expect(authClient.$store.atoms.session?.get().data).toBeTruthy(),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(worlds).toEqual([]);

    act(() => setTestRuntimeGame({ world: "luvia" }));
    await waitFor(() =>
      expect(result.current.factions.get("100")).toBe("BARBATOS"),
    );

    act(() => setTestRuntimeGame({ world: "tempest" }));
    await waitFor(() =>
      expect(result.current.factions.get("200")).toBe("BARBATOS"),
    );
    expect(result.current.factions.has("100")).toBe(false);
    expect(worlds).toEqual(["luvia", "tempest"]);
  } finally {
    unmount();
    restoreApi();
    restorePlatform();
    queryClient.clear();
  }
});
