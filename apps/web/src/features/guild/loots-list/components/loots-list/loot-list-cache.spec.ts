import {
  InfiniteQueryObserver,
  QueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import {
  LOOTS_QUERY_GC_TIME_MS,
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
