import { createTestGateway } from "@/lib/testing/gateway";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type PatchSettingsDocumentsDto,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import {
  DEFAULT_ACTIVITY_FEED_SETTINGS,
  parseActivityFeedSettings,
  type ActivityFeedSettings,
} from "@lootlog/domain/activity-feed";
import { createUserPreferences } from "@/lib/testing/preferences";
// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import "@/i18n/config";
import { DashboardLiveFeed } from "./dashboard-live-feed";
import { feedResponse, feedKill } from "./live-feed-test-data";
import { GatewayEvent } from "@/config/gateway";

const mocks = {
  request: vi.fn<() => Promise<ReturnType<typeof feedResponse>>>(),
  patches: vi.fn<(body: PatchSettingsDocumentsDto) => void>(),
};

let storedSettings: ActivityFeedSettings = DEFAULT_ACTIVITY_FEED_SETTINGS;

let intersect: (visible: boolean) => void = () => undefined;

const settingsDocuments = (): SettingsDocumentsResponseDtoOutput => ({
  domains: {
    general: {
      effective: { activityFeed: storedSettings },
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
});

async function respond(input: RequestInfo | URL, init?: RequestInit) {
  const request =
    input instanceof Request ? input : new Request(String(input), init);

  if (new URL(request.url).pathname !== "/preferences")
    return Response.json(await mocks.request());

  const body: PatchSettingsDocumentsDto = await request.json();

  mocks.patches(body);
  storedSettings = parseActivityFeedSettings(
    Object.assign(
      { ...storedSettings },
      ...body.operations.flatMap(({ set }) =>
        Object.entries(set ?? {}).map(([path, value]) => ({
          [path.replace("activityFeed.", "")]: value,
        })),
      ),
    ),
  );

  return Response.json(settingsDocuments());
}

function seedAccount(queryClient: QueryClient) {
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: feedKill.guild.id, name: feedKill.guild.name }],
  );
  queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    createUserPreferences(),
  );
  queryClient.setQueryData(
    getSettingsDocumentsControllerGetPreferencesQueryKey({
      domains: "general",
    }),
    settingsDocuments(),
  );
}

let gateway: ReturnType<typeof createTestGateway>;

function deliverLifecycleEvent(
  event: GatewayEvent,
  organizationIds = [feedKill.guild.id],
) {
  if (event === GatewayEvent.CONNECT) {
    gateway.setConnectionState("ready");

    return;
  }

  if (event === GatewayEvent.DISCONNECT) {
    gateway.setConnectionState("disconnected");

    return;
  }

  if (event === GatewayEvent.JOIN) {
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection-1",
        organizationIds,
        subscriptionScopes: [],
      },
    });

    return;
  }

  if (event === GatewayEvent.PERMISSIONS_UPDATED) {
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds, subscriptionScopes: [] },
    });

    return;
  }

  throw new Error("Unexpected gateway lifecycle event");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  gateway = createTestGateway();
  gateway.request.mockResolvedValue(undefined);
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: respond,
      },
    }),
  );
  mocks.request.mockReset();
  mocks.patches.mockReset();
  storedSettings = DEFAULT_ACTIVITY_FEED_SETTINGS;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        callback: (entries: Array<{ isIntersecting: boolean }>) => void,
      ) {
        intersect = (visible) => callback([{ isIntersecting: visible }]);
      }

      observe() {}

      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("keeps focused visible rows until the reader applies a grouped update and stores pause on the account", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce(feedResponse(4));
  const root = createRootRoute({ component: DashboardLiveFeed });

  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  seedAccount(queryClient);
  onTestFinished(() => queryClient.clear());
  const GatewayWrapper = gateway.wrapper;
  render(
    <GatewayWrapper>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </GatewayWrapper>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  const link = screen.getByRole("link", { name: "Bicie: Heros" });
  link.focus();
  act(() => intersect(false));
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: { ...feedKill, count: 4, version: 4 },
    }),
  );
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.queryByText("×4")).toBeNull();
  expect(document.activeElement).toBe(link);
  expect(screen.queryByText("Aktualizacje wstrzymane")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Nowe zdarzenia" }));
  expect(screen.getByText("×4")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Wstrzymaj" }));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(screen.getByRole("button", { name: "Wznów" })).toBeTruthy();
  expect(mocks.patches).toHaveBeenCalledWith({
    operations: [
      {
        domain: "general",
        scope: { type: "USER", id: "user-1" },
        set: { "activityFeed.paused": true },
        unset: [],
      },
    ],
  });
  mocks.request.mockResolvedValue(feedResponse(4));
  fireEvent.click(screen.getByRole("button", { name: "Wznów" }));
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByRole("button", { name: "Wstrzymaj" })).toBeTruthy();
});

it("adds organization copies to one row and preserves that row during an HTTP refresh", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  const response = feedResponse();
  response.items = response.items.map((item) => ({
    ...item,
    groupKey: "same-kill",
  }));
  let finish: (data: typeof response) => void = () => undefined;
  mocks.request
    .mockReset()
    .mockResolvedValueOnce(response)
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  const root = createRootRoute({ component: DashboardLiveFeed });

  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  seedAccount(queryClient);
  onTestFinished(() => queryClient.clear());
  const GatewayWrapper = gateway.wrapper;
  render(
    <GatewayWrapper>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </GatewayWrapper>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  const link = screen.getByRole("link", { name: "Bicie: Heros" });
  const row = link.closest("li");
  const item = response.items[0];

  if (!item) throw new Error("Missing fixture");
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...item,
        id: "copy",
        guild: { id: "second", name: "Druga organizacja", vanityUrl: null },
      },
    }),
  );
  expect(screen.getAllByRole("link", { name: "Bicie: Heros" })).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Druga organizacja" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Bicie: Heros" }).closest("li")).toBe(
    row,
  );
  link.focus();

  for (const event of [
    GatewayEvent.JOIN,
    GatewayEvent.DISCONNECT,
    GatewayEvent.CONNECT,
    GatewayEvent.JOIN,
  ]) {
    act(() => deliverLifecycleEvent(event));
    expect(
      screen.getByRole("link", { name: "Bicie: Heros" }).closest("li"),
    ).toBe(row);
    expect(document.activeElement).toBe(link);
    expect(screen.queryByRole("status", { name: "Ładowanie..." })).toBeNull();
  }

  expect(screen.getByRole("link", { name: "Bicie: Heros" }).closest("li")).toBe(
    row,
  );
  expect(screen.queryByRole("status", { name: "Ładowanie..." })).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    finish(response);
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByRole("link", { name: "Bicie: Heros" }).closest("li")).toBe(
    row,
  );
  expect(screen.queryByRole("link", { name: "Druga organizacja" })).toBeNull();
});

it("keeps the same focused row throughout debounced permission revalidation", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  let finish: (data: ReturnType<typeof feedResponse>) => void = () => undefined;
  mocks.request
    .mockReset()
    .mockResolvedValueOnce(feedResponse())
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  const root = createRootRoute({ component: DashboardLiveFeed });

  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  seedAccount(queryClient);
  onTestFinished(() => queryClient.clear());
  const GatewayWrapper = gateway.wrapper;
  render(
    <GatewayWrapper>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </GatewayWrapper>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  const link = screen.getByRole("link", { name: "Bicie: Heros" });
  const row = link.closest("li");
  link.focus();
  const source = feedResponse().items[0];

  if (!source) throw new Error("Missing fixture");
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...source,
        id: "revoked-copy",
        groupKey: source.id,
        guild: { id: "revoked", name: "Odebrana organizacja", vanityUrl: null },
      },
    }),
  );
  expect(
    screen.getByRole("link", { name: "Odebrana organizacja" }),
  ).toBeTruthy();

  for (let index = 0; index < 3; index += 1) {
    act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
    expect(
      screen.queryByRole("link", { name: "Odebrana organizacja" }),
    ).toBeNull();
    expect(screen.queryByRole("status", { name: "Ładowanie..." })).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(
      screen.getByRole("link", { name: "Bicie: Heros" }).closest("li"),
    ).toBe(row);
    expect(document.activeElement).toBe(link);
  }

  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(4000));
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("link", { name: "Bicie: Heros" }).closest("li")).toBe(
    row,
  );
  await act(async () => {
    finish(feedResponse(4));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByText("×4")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Bicie: Heros" }).closest("li")).toBe(
    row,
  );
  expect(document.activeElement).toBe(link);
});
