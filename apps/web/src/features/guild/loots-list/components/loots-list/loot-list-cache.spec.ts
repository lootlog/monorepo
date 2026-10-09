import {
  InfiniteQueryObserver,
  QueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import {
  LOOTS_PAGE_LIMIT,
  LOOTS_QUERY_GC_TIME_MS,
  applyLootSnapshots,
  lootMatchesListParams,
  reconcileActiveLootLists,
} from "./loot-list-cache";

afterEach(() => vi.useRealTimers());

it("reconciles one server page for active filters, preserves other organizations and expires closed filters", async () => {
  vi.useFakeTimers();

  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: LOOTS_QUERY_GC_TIME_MS },
    },
  });

  const activeKey = [
    "/guilds/one/loots",
    { world: "tempest", search: "sword" },
  ];

  const inactiveKey = [
    "/guilds/one/loots",
    { world: "tempest", search: "old" },
  ];

  const otherKey = ["/guilds/two/loots", { world: "tempest" }];

  const history: InfiniteData<Loot[]> = {
    pages: [[], [], []],
    pageParams: [0, 20, 40],
  };

  for (const key of [activeKey, inactiveKey, otherKey])
    client.setQueryData(key, history);

  const fetchPage = vi.fn(async ({ pageParam }: { pageParam: number }) => [
    pageParam,
  ]);

  const observer = new InfiniteQueryObserver(client, {
    queryKey: activeKey,
    queryFn: fetchPage,
    initialPageParam: 0,
    getNextPageParam: () => 20,
    staleTime: Infinity,
  });

  const unsubscribe = observer.subscribe(() => undefined);
  await reconcileActiveLootLists(client, "one");
  expect(fetchPage).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(activeKey)).toEqual({
    pages: [[0]],
    pageParams: [0],
  });
  expect(client.getQueryData(inactiveKey)).toEqual(history);
  expect(client.getQueryState(inactiveKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  await observer.fetchNextPage();
  expect(client.getQueryData(activeKey)).toEqual({
    pages: [[0], [20]],
    pageParams: [0, 20],
  });
  await vi.advanceTimersByTimeAsync(LOOTS_QUERY_GC_TIME_MS);
  expect(client.getQueryData(inactiveKey)).toBeUndefined();
  unsubscribe();
  client.clear();
});

it("reports server reconciliation failures rather than marking retained rows current", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const observer = new InfiniteQueryObserver(client, {
    queryKey: ["/guilds/one/loots"],
    initialData: { pages: [[]], pageParams: [0] },
    queryFn: async () => {
      throw new Error("unavailable");
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    staleTime: Infinity,
  });

  const unsubscribe = observer.subscribe(() => undefined);
  await expect(reconcileActiveLootLists(client, "one")).rejects.toThrow(
    "unavailable",
  );
  unsubscribe();
  client.clear();
});

const lootWith = (id: number, overrides: Partial<Loot> = {}): Loot => ({
  id,
  uniqueId: String(id),
  world: "tempest",
  source: "FIGHT",
  location: "Map",
  items: [],
  players: [],
  mapPlayersSnapshot: null,
  npcs: [],
  lootShare: {},
  createdAt: "2026-10-09T00:00:00.000Z",
  updatedAt: "2026-10-09T00:00:00.000Z",
  commentsCount: 0,
  ...overrides,
});

const item = (prof: Loot["items"][number]["prof"], lvl = 50) => ({
  id: 1,
  hid: "hid",
  name: "Sword",
  icon: "sword.gif",
  stat: "",
  type: null,
  rarity: null,
  lvl,
  prof,
});

it("matches live loots against list filters as the server query does", () => {
  const warriorItem = lootWith(1, { items: [item(["WARRIOR"])] });
  const anyProfessionItem = lootWith(2, { items: [item([])] });

  expect(
    [warriorItem, anyProfessionItem].map((loot) =>
      lootMatchesListParams(loot, { professions: ["MAGE"] }),
    ),
  ).toEqual([false, true]);

  // A level range never matches an NPC whose level is unknown.
  expect(
    lootMatchesListParams(
      lootWith(3, {
        npcs: [
          {
            id: 1,
            name: "Hero",
            wt: null,
            lvl: null,
            prof: null,
            icon: null,
            type: "HERO",
            margonemType: null,
          },
        ],
      }),
      { npcLevelMin: 1 },
    ),
  ).toBe(false);

  expect(lootMatchesListParams(warriorItem, { search: "sword" })).toBe(
    undefined,
  );
});

it("places snapshots by id among loaded pages and leaves unread pages to pagination", () => {
  const client = new QueryClient();
  const key = ["/guilds/one/loots", { world: "tempest" }];

  const fullPage = Array.from({ length: LOOTS_PAGE_LIMIT }, (_, index) =>
    lootWith(100 - index),
  );

  client.setQueryData<InfiniteData<Loot[]>>(key, {
    pages: [fullPage],
    pageParams: [0],
  });

  const ids = () =>
    client
      .getQueryData<InfiniteData<Loot[]>>(key)
      ?.pages.flat()
      .map((loot) => loot.id);

  expect(applyLootSnapshots(client, "one", [lootWith(101), lootWith(90)])).toBe(
    false,
  );
  expect(ids()?.slice(0, 3)).toEqual([101, 100, 99]);
  // A redelivered loot replaces its entry.
  expect(ids()?.filter((id) => id === 90)).toEqual([90]);

  // Older than the full last page: its page has not been read yet.
  applyLootSnapshots(client, "one", [lootWith(50)]);
  expect(ids()).not.toContain(50);
});
