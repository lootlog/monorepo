// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { GuildContext } from "@/contexts/guild.context";
import { ThemeContext } from "@/contexts/theme-context";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useLiveLootList } from "./use-live-loot-list";
import "@/i18n/config";

function Probe() {
  const list = useLiveLootList();
  const { setFilters } = useLootsFilters();

  return (
    <>
      <button onClick={() => void setFilters({ search: "shield" })}>
        Change filter
      </button>
      <output>
        {JSON.stringify({
          ids: list.allLoots.map((loot) => loot.id),
          isEmpty: list.isEmpty,
          isPending: list.isPending,
        })}
      </output>
    </>
  );
}

const loot = {
  id: 1,
  uniqueId: "one",
  mapPlayersSnapshot: null,
  world: "tempest",
  source: "FIGHT",
  location: "Map",
  items: [],
  players: [],
  npcs: [],
  lootShare: {},
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
  commentsCount: 0,
};

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

async function mount(
  fetchLoots: () => Promise<Response>,
  fetchGuilds?: () => Promise<Response>,
) {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue(undefined);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("/loots?")) return fetchLoots();

    if (fetchGuilds) return fetchGuilds();

    return Response.json([
      { id: "one", vanityUrl: "alias" },
      { id: "two", vanityUrl: "second-alias" },
    ]);
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
  render(
    <GatewayWrapper>
      <QueryClientProvider client={client}>
        <GuildContext value={{ world: "tempest", setWorld: () => undefined }}>
          <ThemeContext
            value={{
              theme: "default",
              resolvedTheme: "default",
              isLoading: false,
              setTheme: () => undefined,
            }}
          >
            <NuqsTestingAdapter searchParams="search=sword" hasMemory>
              <RouterProvider router={router} />
            </NuqsTestingAdapter>
          </ThemeContext>
        </GuildContext>
      </QueryClientProvider>
    </GatewayWrapper>,
  );
  await act(async () => {
    await router.load();
    await vi.advanceTimersByTimeAsync(1);
  });

  return { gateway, client, fetch };
}

it("delivered duplicate, share and reconnect events reconcile once through the filtered server list without detail GETs", async () => {
  const listRequests = vi.fn(async () => Response.json([loot]));
  const { gateway, fetch } = await mount(listRequests);
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    for (let event = 0; event < 200; event++)
      gateway.deliver({
        v: 1,
        type: "loot.created",
        data: { version: 2, guildId: "one", lootId: 2, npcs: [] },
      });
    gateway.deliver({
      v: 1,
      type: "loot.share-updated",
      data: { version: 2, guildId: "one", lootId: 2, npcs: [], lootShare: {} },
    });
    gateway.setConnectionState("disconnected");
    gateway.setConnectionState("ready");
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(2);
  expect(
    fetch.mock.calls.filter(([input]) => String(input).includes("/loots/")),
  ).toHaveLength(0);
  expect(
    fetch.mock.calls
      .filter(([input]) => String(input).includes("/loots?"))
      .every(([input]) => String(input).includes("search=sword")),
  ).toBe(true);
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "loot.created",
      data: { version: 2, guildId: "other", lootId: 3, npcs: [] },
    });
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(2);
});

it("retains visible loots through reconnect, background refresh and its failure", async () => {
  let resolvePending: (response: Response) => void = () => undefined;

  const pending = new Promise<Response>((resolve) => {
    resolvePending = resolve;
  });

  const listRequests = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(Response.json([loot]))
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce(Response.json([{ ...loot, id: 2 }]));

  const { gateway } = await mount(listRequests);

  await act(async () => {
    gateway.setConnectionState("disconnected");
    gateway.setConnectionState("ready");
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "reconnected",
        organizationIds: ["one"],
        subscriptionScopes: [],
      },
    });
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  expect(listRequests).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolvePending(new Response(null, { status: 503 }));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(65_000);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[2]');
  expect(listRequests).toHaveBeenCalledTimes(3);
});

it.each(["permissions", "reconnect"] as const)(
  "%s clears alias and canonical caches and rejects an old in-flight response",
  async (event) => {
    let resolveOld: (response: Response) => void = () => undefined;

    const oldResponse = new Promise<Response>((resolve) => {
      resolveOld = resolve;
    });

    const listRequests = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(Response.json([loot]))
      .mockReturnValueOnce(oldResponse)
      .mockResolvedValue(Response.json([]));

    const { gateway, client } = await mount(listRequests);
    client.setQueryData(["/guilds/one/loots/1"], loot);
    client.setQueryData(["/guilds/alias/loots/1"], loot);
    client.setQueryData(["/guilds/one/loots/stats"], { count: 1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(listRequests).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (event === "permissions") {
        gateway.deliver({
          v: 1,
          type: "permissions.updated",
          data: { organizationIds: [], subscriptionScopes: [] },
        });
      } else {
        gateway.setConnectionState("disconnected");
        gateway.setConnectionState("ready");
        gateway.deliver({
          v: 1,
          type: "session.joined",
          data: {
            connectionId: "reconnected",
            organizationIds: [],
            subscriptionScopes: [],
          },
        });
      }

      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[]');
    expect(client.getQueryData(["/guilds/one/loots/1"])).toBeUndefined();
    expect(client.getQueryData(["/guilds/alias/loots/1"])).toBeUndefined();
    expect(client.getQueryData(["/guilds/one/loots/stats"])).toEqual({
      count: 1,
    });
    await act(async () => {
      resolveOld(Response.json([loot]));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[]');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(listRequests).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status").textContent).toContain('"ids":[]');
  },
);

it.each([
  { change: "unchanged", levelTo: 300, visibleIds: [1] },
  { change: "expanded", levelTo: 500, visibleIds: [1] },
  { change: "restricted", levelTo: 100, visibleIds: [] },
])(
  "handles $change loot access after reconnect without assuming a revocation",
  async ({ levelTo, visibleIds }) => {
    const { gateway } = await mount(async () => Response.json([loot]));

    const joined = (to: number) =>
      gateway.deliver({
        v: 1,
        type: "session.joined",
        data: {
          connectionId: "connection",
          organizationIds: ["one"],
          subscriptionScopes: [],
          accessPolicy: createAccessPolicySnapshot(
            [
              {
                guild: { id: "one", ownerId: "owner" },
                roles: [
                  {
                    permissions: [Permission.LOOTLOG_LOOTS_READ],
                    lvlRangeFrom: 0,
                    lvlRangeTo: to,
                  },
                ],
              },
            ],
            "member",
          ),
        },
      });

    await act(async () => {
      joined(300);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
    await act(async () => {
      gateway.setConnectionState("disconnected");
      gateway.setConnectionState("ready");
      joined(levelTo);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain(
      `"ids":${JSON.stringify(visibleIds)}`,
    );
  },
);

it("reports a fetched empty page as empty but a policy clear as pending", async () => {
  const { gateway } = await mount(async () => Response.json([]));

  expect(screen.getByRole("status").textContent).toContain(
    '"isEmpty":true,"isPending":false',
  );

  // A restriction clears the active list; the tab is hidden, so the
  // reconciliation refetch has not run yet and no page exists.
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["one"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "one", ownerId: "owner" },
              roles: [
                {
                  permissions: [Permission.LOOTLOG_LOOTS_READ],
                  lvlRangeFrom: 0,
                  lvlRangeTo: 100,
                },
              ],
            },
          ],
          "member",
        ),
      },
    });
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain(
    '"isEmpty":false,"isPending":true',
  );
});

it.each(["reconnect", "permissions"] as const)(
  "%s restrictions clear only the affected Organization's canonical and alias caches",
  async (event) => {
    const { gateway, client } = await mount(async () => Response.json([loot]));

    const policy = (restricted: boolean) =>
      createAccessPolicySnapshot(
        ["one", "two"].map((id) => ({
          guild: { id, ownerId: "owner" },
          roles: [
            {
              permissions: [Permission.LOOTLOG_LOOTS_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: restricted && id === "two" ? 100 : 300,
            },
          ],
        })),
        "member",
      );

    const baseline = {
      connectionId: "connection",
      organizationIds: ["one", "two"],
      subscriptionScopes: [],
      accessPolicy: policy(false),
    };

    await act(async () => {
      gateway.deliver({ v: 1, type: "session.joined", data: baseline });
      await vi.advanceTimersByTimeAsync(1);
    });

    for (const route of ["one", "alias", "two", "second-alias"]) {
      client.setQueryData([`/guilds/${route}/loots/1`], loot);
    }

    client.setQueryData(["/guilds/second-alias/loots", { search: "old" }], {
      pages: [[loot]],
      pageParams: [0],
    });
    await act(async () => {
      if (event === "reconnect") {
        gateway.setConnectionState("disconnected");
        gateway.setConnectionState("ready");
        gateway.deliver({
          v: 1,
          type: "session.joined",
          data: { ...baseline, accessPolicy: policy(true) },
        });
      } else {
        gateway.deliver({
          v: 1,
          type: "permissions.updated",
          data: {
            organizationIds: ["one", "two"],
            subscriptionScopes: [],
            accessPolicy: policy(true),
          },
        });
      }

      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
    expect(client.getQueryData(["/guilds/one/loots/1"])).toEqual(loot);
    expect(client.getQueryData(["/guilds/alias/loots/1"])).toEqual(loot);
    expect(client.getQueryData(["/guilds/two/loots/1"])).toBeUndefined();
    expect(
      client.getQueryData(["/guilds/second-alias/loots/1"]),
    ).toBeUndefined();
    expect(
      client.getQueryData(["/guilds/second-alias/loots", { search: "old" }]),
    ).toBeUndefined();
  },
);

it("resumes event reconciliation for new filters after an old filter's refresh fails", async () => {
  const listRequests = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(Response.json([loot]))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockImplementation(async () => Response.json([{ ...loot, id: 2 }]));

  const { gateway, fetch } = await mount(listRequests);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(35_000);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Change filter" }));
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[2]');
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "loot.created",
      data: { version: 2, guildId: "one", lootId: 3, npcs: [] },
    });
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(4);
  expect(
    fetch.mock.calls.filter(([input]) =>
      String(input).includes("search=shield"),
    ),
  ).toHaveLength(2);
});

it("keeps fetched loots when joining before the route alias is resolved", async () => {
  let resolveGuilds: (response: Response) => void = () => undefined;

  const pendingGuilds = new Promise<Response>((resolve) => {
    resolveGuilds = resolve;
  });

  const listRequests = vi.fn(async () => Response.json([loot]));
  const { gateway } = await mount(listRequests, () => pendingGuilds);

  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection",
        organizationIds: ["one"],
        subscriptionScopes: [],
      },
    });
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    resolveGuilds(Response.json([{ id: "one", vanityUrl: "alias" }]));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  expect(listRequests).toHaveBeenCalledTimes(1);
});
