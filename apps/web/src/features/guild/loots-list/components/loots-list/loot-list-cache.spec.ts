import {
  QueryClient,
  QueryObserver,
  type InfiniteData,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import {
  LOOTS_QUERY_GC_TIME_MS,
  patchActiveLootLists,
} from "./loot-list-cache";

afterEach(() => vi.useRealTimers());

it("releases closed filters after five minutes even while new loot events arrive", async () => {
  vi.useFakeTimers();
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 24 * 60 * 60_000 } },
  });
  const key = ["/guilds/one/loots", { world: "tempest" }];
  const observer = new QueryObserver(client, {
    queryKey: key,
    initialData: { pages: [[], []], pageParams: [0, 20] },
    staleTime: Infinity,
    gcTime: LOOTS_QUERY_GC_TIME_MS,
  });
  const unsubscribe = observer.subscribe(() => undefined);
  unsubscribe();
  await vi.advanceTimersByTimeAsync(LOOTS_QUERY_GC_TIME_MS - 1000);
  patchActiveLootLists(client, "one", (data) => data);
  expect(client.getQueryData(key)).toBeDefined();
  await vi.advanceTimersByTimeAsync(1000);
  expect(client.getQueryData(key)).toBeUndefined();
  client.clear();
});

it("patches only active organization lists and preserves inactive history until refetch", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const activeKey = ["/guilds/one/loots", { world: "tempest" }];
  const inactiveKey = [
    "/guilds/one/loots",
    { world: "tempest", search: "old" },
  ];
  const otherKey = ["/guilds/two/loots", { world: "tempest" }];
  const history: InfiniteData<Loot[]> = {
    pages: [[], []],
    pageParams: [0, 20],
  };
  for (const key of [activeKey, inactiveKey, otherKey])
    client.setQueryData(key, history);
  const activeObserver = new QueryObserver(client, {
    queryKey: activeKey,
    staleTime: Infinity,
  });
  const unsubscribe = activeObserver.subscribe(() => undefined);
  const patch = vi.fn((data: InfiniteData<Loot[]> | undefined) => data);
  patchActiveLootLists(client, "one", patch);
  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch).toHaveBeenCalledWith(history, activeKey);
  expect(client.getQueryData(inactiveKey)).toEqual(history);
  expect(client.getQueryState(inactiveKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  const refresh = vi.fn(async () => history);
  const reopened = new QueryObserver(client, {
    queryKey: inactiveKey,
    queryFn: refresh,
    staleTime: Infinity,
  });
  const close = reopened.subscribe(() => undefined);
  await client.refetchQueries({ queryKey: inactiveKey });
  expect(refresh).toHaveBeenCalled();
  close();
  unsubscribe();
  client.clear();
});
