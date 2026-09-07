import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
  type AccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createGameAccessCache } from "./game-access-cache";

const policy = (titans = true, maxLevel = 500) =>
  createAccessPolicySnapshot(
    ["a", "b"].map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [
        {
          permissions: [
            Permission.LOOTLOG_ACCESS,
            Permission.LOOTLOG_TIMERS_READ,
            ...(titans || id === "b"
              ? [Permission.LOOTLOG_TIMERS_TITANS_READ]
              : []),
          ],
          lvlRangeFrom: 0,
          lvlRangeTo: id === "a" ? maxLevel : 500,
        },
      ],
    })),
    "reader",
  );
const timer = (guildId: string, type: string, lvl = 100) => ({
  guildId,
  npc: { type, lvl },
});
const notify = (
  manager: ReturnType<typeof createGameAccessCache>,
  previous: AccessPolicySnapshot,
  next: AccessPolicySnapshot,
) =>
  manager.apply({
    accessPolicy: next,
    changes: diffAccessPolicies(previous, next),
  });

afterEach(() => vi.useRealTimers());
it("removes only revoked timer tiers from every world and both history caches", () => {
  const client = new QueryClient();
  const manager = createGameAccessCache(client);
  const before = policy();
  manager.apply({ accessPolicy: before, changes: [] });
  const allowed = timer("a", "ELITE2");
  const other = timer("b", "TITAN");
  const revoked = timer("a", "TITAN");
  for (const world of ["alpha", "beta"])
    client.setQueryData(["/timers", { world }], [allowed, other, revoked]);
  client.setQueryData(
    ["/timers/history", { guildId: "a", world: "alpha" }],
    [revoked, allowed],
  );
  client.setQueryData(
    ["/guilds/a/timers/titan/history", { world: "alpha" }],
    [revoked],
  );
  const untouchedHistory = [other];
  client.setQueryData(["/guilds/b/timers/titan/history"], untouchedHistory);
  const otherReference = client.getQueryData([
    "/guilds/b/timers/titan/history",
  ]);
  notify(manager, before, policy(false));
  for (const world of ["alpha", "beta"])
    expect(client.getQueryData(["/timers", { world }])).toEqual([
      allowed,
      other,
    ]);
  expect(
    client.getQueryData(["/timers/history", { guildId: "a", world: "alpha" }]),
  ).toEqual([allowed]);
  expect(
    client.getQueryData(["/guilds/a/timers/titan/history", { world: "alpha" }]),
  ).toEqual([]);
  expect(client.getQueryData(["/guilds/b/timers/titan/history"])).toBe(
    otherReference,
  );
  manager.dispose();
});
it("prunes level restrictions and cannot restore a cancelled old-policy response", async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const manager = createGameAccessCache(client);
  const before = policy();
  manager.apply({ accessPolicy: before, changes: [] });
  const key = ["/timers", { world: "alpha" }];
  const low = timer("a", "ELITE2", 50);
  const high = timer("a", "ELITE2", 200);
  const other = timer("b", "ELITE2", 200);
  client.setQueryData(key, [low, high, other]);
  let finish: (rows: (typeof low)[]) => void = () => undefined;
  const request = client
    .fetchQuery({
      queryKey: key,
      queryFn: () =>
        new Promise<(typeof low)[]>((resolve) => {
          finish = resolve;
        }),
    })
    .catch(() => undefined);
  notify(manager, before, policy(true, 100));
  expect(client.getQueryData(key)).toEqual([low, other]);
  finish([low, high, other]);
  await request;
  expect(client.getQueryData(key)).toEqual([low, other]);
  manager.dispose();
});
it("does no work for repeated policy snapshots and coalesces expansions without clearing visible rows", async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const manager = createGameAccessCache(client);
  const before = policy(false, 100);
  manager.apply({ accessPolicy: before, changes: [] });
  const key = ["/timers", { world: "alpha" }];
  const row = timer("a", "ELITE2", 50);
  client.setQueryData(key, [row]);
  const fetch = vi.fn().mockResolvedValue([row, timer("a", "TITAN")]);
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: fetch,
    staleTime: Infinity,
  });
  const off = observer.subscribe(() => {});
  const original = client.getQueryData(key);
  for (let index = 0; index < 10; index += 1)
    manager.apply({ accessPolicy: before, changes: [] });
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetch).not.toHaveBeenCalled();
  const expanded = policy(true, 200);
  notify(manager, before, expanded);
  await vi.advanceTimersByTimeAsync(1000);
  notify(manager, expanded, policy(true, 300));
  expect(client.getQueryData(key)).toBe(original);
  await vi.advanceTimersByTimeAsync(4999);
  expect(fetch).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  off();
  manager.dispose();
});
it("checks cached data against the first snapshot even when its delta contains only grants", () => {
  const client = new QueryClient();
  const manager = createGameAccessCache(client);
  const allowed = timer("b", "TITAN");
  client.setQueryData(
    ["/timers", { world: "alpha" }],
    [timer("a", "TITAN"), allowed, timer("removed", "ELITE2")],
  );
  notify(manager, createAccessPolicySnapshot([], "reader"), policy(false));
  expect(client.getQueryData(["/timers", { world: "alpha" }])).toEqual([
    allowed,
  ]);
  manager.dispose();
});

it("conservatively clears legacy snapshots and coalesces old gateway refreshes", async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const manager = createGameAccessCache(client);
  manager.apply({ accessPolicy: policy(), changes: [] });
  const key = ["/timers", { world: "alpha" }];
  const row = timer("a", "TITAN");
  client.setQueryData(key, [row]);
  const fetch = vi.fn().mockResolvedValue([]);
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: fetch,
    staleTime: Infinity,
  });
  const off = observer.subscribe(() => {});
  manager.apply({ guilds: [] });
  expect(client.getQueryData(key)).toEqual([]);
  await vi.advanceTimersByTimeAsync(1000);
  manager.apply({ guilds: [] });
  await vi.advanceTimersByTimeAsync(4999);
  expect(fetch).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(fetch).toHaveBeenCalledTimes(1);
  off();
  manager.dispose();
});

it("does not retry a cancelled history request for a removed organization", async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const manager = createGameAccessCache(client);
  const before = policy();
  manager.apply({ accessPolicy: before });
  const key = ["/guilds/a/timers/titan/history"];
  const fetch = vi.fn(() => new Promise(() => {}));
  const observer = new QueryObserver(client, { queryKey: key, queryFn: fetch });
  const off = observer.subscribe(() => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  manager.apply({ accessPolicy: createAccessPolicySnapshot([], "reader") });
  expect(client.getQueryData(key)).toEqual([]);
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetch).toHaveBeenCalledTimes(1);
  off();
  manager.dispose();
});
