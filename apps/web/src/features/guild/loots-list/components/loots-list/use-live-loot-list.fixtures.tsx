import { TEST_THEME_CONTEXT } from "@/lib/testing/theme-context";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, beforeEach, onTestFinished, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { storeGuildWorld } from "@/hooks/context/use-guild-world";
import { ThemeContext } from "@/contexts/theme-context";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useLiveLootList } from "./use-live-loot-list";
import "@/i18n/config";

function Probe() {
  const {
    allLoots,
    isEmpty,
    isPending,
    isFailed,
    newLootCount,
    setScrollElement,
    resumeReconciliation,
  } = useLiveLootList();

  const { setFilters } = useLootsFilters();

  return (
    <>
      <button onClick={() => void setFilters({ search: "shield" })}>
        Change filter
      </button>
      <div
        ref={setScrollElement}
        data-testid="loot-scroll"
        onScroll={resumeReconciliation}
      />
      <output>
        {JSON.stringify({
          ids: allLoots.map((loot) => loot.id),
          isEmpty,
          isPending,
          isFailed,
          newLootCount,
        })}
      </output>
    </>
  );
}

export const loot = {
  id: 1,
  uniqueId: "one",
  mapPlayersSnapshot: null,
  world: "tempest",
  source: "FIGHT" as const,
  location: "Map",
  items: [],
  players: [],
  npcs: [],
  lootShare: {},
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
  commentsCount: 0,
};

export const lootPage = (items: Array<typeof loot>) => ({
  items,
  nextCursor: null,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

export async function mount(
  fetchLoots: () => Promise<Response>,
  fetchGuilds?: () => Promise<Response>,
  searchParams = "search=sword",
) {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue(undefined);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const fetch = vi.fn((input: RequestInfo | URL): Promise<Response> => {
    if (String(input).includes("/loots?")) return fetchLoots();

    if (fetchGuilds) return fetchGuilds();

    return Promise.resolve(
      Response.json([
        { id: "one", vanityUrl: "alias" },
        { id: "two", vanityUrl: "second-alias" },
      ]),
    );
  });

  onTestFinished(
    configureApiClients({ main: { baseUrl: "https://api.test", fetch } }),
  );
  onTestFinished(() => client.clear());
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/loots",
    component: Probe,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/alias/loots"] }),
  });

  const GatewayWrapper = gateway.wrapper;

  storeGuildWorld("alias", "tempest");

  const app = (
    <GatewayWrapper>
      <QueryClientProvider client={client}>
        <ThemeContext value={TEST_THEME_CONTEXT}>
          <NuqsTestingAdapter searchParams={searchParams} hasMemory>
            <RouterProvider router={router} />
          </NuqsTestingAdapter>
        </ThemeContext>
      </QueryClientProvider>
    </GatewayWrapper>
  );

  render(app);
  await act(async () => {
    await router.load();
    await vi.advanceTimersByTimeAsync(1);
  });

  return {
    gateway,
    client,
    fetch,
    changeWorld: () => storeGuildWorld("alias", "katahha"),
  };
}

export const snapshot = (id: number, world = "tempest") =>
  ({
    v: 1,
    type: "loot.snapshot",
    data: {
      version: 2,
      guildId: "one",
      lootId: id,
      npcs: [],
      loot: { ...loot, id, uniqueId: String(id), world },
    },
  }) as const;

export const listState = () =>
  JSON.parse(screen.getByRole("status").textContent);
