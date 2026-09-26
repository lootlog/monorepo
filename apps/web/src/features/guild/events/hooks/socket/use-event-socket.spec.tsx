// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
  InfiniteQueryObserver,
  type InfiniteData,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import {
  getEventsMonitoringControllerGetCoordinationQueryKey,
  getListEventMapsQueryKey,
} from "@lootlog/client/main";
import { createTestGateway } from "@/lib/testing/gateway";
import { useEventSocket } from "./use-event-socket";

const routeScope = { guildId: "guild-alias", eventId: "event-1" };

const mapsKey = getListEventMapsQueryKey(routeScope);

const coordinationKey =
  getEventsMonitoringControllerGetCoordinationQueryKey(routeScope);

function setup(
  options = {
    guildId: "guild-1",
    routeGuildId: "guild-alias",
    eventId: "event-1",
  },
) {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue({});
  const GatewayWrapper = gateway.wrapper;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });

  onTestFinished(() => queryClient.clear());

  const QueryWrapper = ({ children }: { children: ReactNode }) => (
    <GatewayWrapper>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </GatewayWrapper>
  );

  const hook = renderHook(useEventSocket, {
    initialProps: options,
    wrapper: QueryWrapper,
  });

  return { gateway, queryClient, ...hook };
}

describe("useEventSocket", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    ["event.map-status-updated", undefined],
    ["event.map-status-updated", "presence"],
    ["event.hero-killed", undefined],
    ["event.respawn-window-opened", undefined],
    ["event.respawn-window-closed", undefined],
  ] as const)(
    "refreshes alias-scoped coordination for %s (%s)",
    (type, reason) => {
      const { gateway, queryClient } = setup();
      queryClient.setQueryData(coordinationKey, { heroes: [] });

      const otherGuildKey =
        getEventsMonitoringControllerGetCoordinationQueryKey({
          ...routeScope,
          guildId: "other-guild",
        });

      const otherEventKey =
        getEventsMonitoringControllerGetCoordinationQueryKey({
          ...routeScope,
          eventId: "event-2",
        });

      queryClient.setQueryData(otherGuildKey, { heroes: [] });
      queryClient.setQueryData(otherEventKey, { heroes: [] });

      act(() =>
        gateway.deliver({
          v: 1,
          type,
          data: {
            organizationId: "guild-1",
            payload: {
              guildId: "guild-1",
              eventId: "event-1",
              mapId: "map-1",
              heroId: "hero-1",
              reason,
            },
          },
        }),
      );

      expect(queryClient.getQueryState(coordinationKey)?.isInvalidated).toBe(
        true,
      );
      expect(queryClient.getQueryState(otherGuildKey)?.isInvalidated).toBe(
        false,
      );
      expect(queryClient.getQueryState(otherEventKey)?.isInvalidated).toBe(
        false,
      );
    },
  );

  it.each([
    { guildId: "other-guild", eventId: "event-1" },
    { guildId: "guild-1", eventId: "event-2" },
    { guildId: "guild-alias", eventId: "event-1" },
  ])(
    "ignores realtime messages outside the resolved event scope: %j",
    (payload) => {
      const { gateway, queryClient } = setup();
      queryClient.setQueryData(mapsKey, { heroNpcs: [] });
      queryClient.setQueryData(coordinationKey, { heroes: [] });

      act(() =>
        gateway.deliver({
          v: 1,
          type: "event.map-status-updated",
          data: {
            organizationId: payload.guildId,
            payload: { ...payload, mapId: "map-1" },
          },
        }),
      );

      expect(queryClient.getQueryState(mapsKey)?.isInvalidated).toBe(false);
      expect(queryClient.getQueryState(coordinationKey)?.isInvalidated).toBe(
        false,
      );
    },
  );

  it("clears restricted histories and prevents a canceled request from restoring old pages", async () => {
    const { gateway, queryClient } = setup();

    const historyKey = [
      "/guilds/guild-alias/events/event-1/kill-history",
      { limit: "20" },
    ];

    const timelineKey = [
      "/guilds/guild-alias/events/event-1/heroes/hero-1/kills/kill-1/timeline",
    ];

    const otherEventKey = ["/guilds/guild-alias/events/event-2/kill-history"];
    const unrelatedKey = ["/users/@me/preferences"];

    type Page = { data: string[]; nextCursor: string | null };

    const requests: Array<{ cursor: string | undefined; signal: AbortSignal }> =
      [];

    const resolveStale = vi.fn<(value: Page) => void>();
    const resolveCurrent = vi.fn<(value: Page) => void>();

    queryClient.setQueryData(historyKey, {
      pages: [
        { data: ["restricted"], nextCursor: "older-page" },
        { data: ["older restricted"], nextCursor: null },
      ],
      pageParams: [undefined, "older-page"],
    });

    for (const key of [mapsKey, timelineKey, otherEventKey, unrelatedKey])
      queryClient.setQueryData(key, { private: true });

    const observer = new InfiniteQueryObserver<
      Page,
      Error,
      InfiniteData<Page>,
      typeof historyKey,
      string | undefined
    >(queryClient, {
      queryKey: historyKey,
      initialPageParam: undefined,
      getNextPageParam: (page: Page) => page.nextCursor ?? undefined,
      queryFn: ({ pageParam, signal }) => {
        requests.push({ cursor: pageParam, signal });

        return new Promise<Page>((resolve) => {
          if (requests.length === 1) resolveStale.mockImplementation(resolve);
          else resolveCurrent.mockImplementation(resolve);
        });
      },
    });

    onTestFinished(observer.subscribe(() => {}));

    void queryClient.invalidateQueries({ queryKey: historyKey });
    await waitFor(() => expect(requests).toHaveLength(1));

    act(() =>
      gateway.deliver({
        v: 1,
        type: "permissions.updated",
        data: { organizationIds: [], subscriptionScopes: [] },
      }),
    );

    expect(requests[0]?.signal.aborted).toBe(true);
    expect(queryClient.getQueryData(historyKey)).toBeUndefined();
    expect(queryClient.getQueryData(mapsKey)).toBeUndefined();
    expect(queryClient.getQueryData(timelineKey)).toBeUndefined();
    expect(queryClient.getQueryData(otherEventKey)).toBeUndefined();
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ private: true });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.cursor).toBeUndefined();
    await act(async () =>
      resolveCurrent({ data: ["visible"], nextCursor: null }),
    );
    await act(async () =>
      resolveStale({ data: ["restricted"], nextCursor: "older-page" }),
    );

    expect(queryClient.getQueryData(historyKey)).toEqual({
      pages: [{ data: ["visible"], nextCursor: null }],
      pageParams: [undefined],
    });
  });

  it("reconciles only the current event after a successful session join", () => {
    const { gateway, queryClient } = setup();
    const eventPath = "/guilds/guild-alias/events/event-1";

    const eventKeys = [
      "",
      "/coordination",
      "/maps",
      "/ranking",
      "/kills",
      "/kill-history",
      "/timers",
      "/heroes/hero-1/active-gaps",
      "/heroes/hero-1/respawn-config",
    ].map((suffix) => [`${eventPath}${suffix}`]);

    const unrelatedKeys = [
      ["/guilds/guild-alias/events"],
      ["/guilds/guild-alias/events/event-12/maps"],
      ["/guilds/other-guild/events/event-1/maps"],
    ];

    for (const key of [...eventKeys, ...unrelatedKeys])
      queryClient.setQueryData(key, {});

    act(() =>
      gateway.deliver({
        v: 1,
        type: "session.joined",
        data: {
          connectionId: "reconnected",
          organizationIds: ["guild-1"],
          subscriptionScopes: [],
        },
      }),
    );

    for (const key of eventKeys)
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);

    for (const key of unrelatedKeys)
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it("replaces an older coordination refresh when another event arrives", async () => {
    const { gateway, queryClient } = setup();
    queryClient.setQueryData(coordinationKey, { heroes: ["initial"] });

    const resolveOlderResponse =
      vi.fn<(response: { heroes: string[] }) => void>();

    const olderResponse = new Promise<{ heroes: string[] }>((resolve) => {
      resolveOlderResponse.mockImplementation(resolve);
    });

    const fetchCoordination = vi
      .fn()
      .mockReturnValueOnce(olderResponse)
      .mockResolvedValueOnce({ heroes: ["newest"] });

    const observer = new QueryObserver(queryClient, {
      queryKey: coordinationKey,
      queryFn: fetchCoordination,
    });

    onTestFinished(observer.subscribe(() => {}));

    await act(async () => {
      gateway.deliver({
        v: 1,
        type: "event.map-status-updated",
        data: {
          organizationId: "guild-1",
          payload: { guildId: "guild-1", eventId: "event-1", mapId: "map-1" },
        },
      });
    });
    expect(fetchCoordination).toHaveBeenCalledTimes(1);

    await act(async () => {
      gateway.deliver({
        v: 1,
        type: "event.hero-killed",
        data: {
          organizationId: "guild-1",
          payload: { guildId: "guild-1", eventId: "event-1" },
        },
      });
    });
    expect(fetchCoordination).toHaveBeenCalledTimes(2);
    expect(queryClient.getQueryData(coordinationKey)).toEqual({
      heroes: ["newest"],
    });

    await act(async () => resolveOlderResponse({ heroes: ["older"] }));
    expect(queryClient.getQueryData(coordinationKey)).toEqual({
      heroes: ["newest"],
    });
  });

  it("fetches coordination once for a realtime change and stops listening after unmount", async () => {
    const { gateway, queryClient, unmount } = setup();
    queryClient.setQueryData(coordinationKey, { heroes: [] });

    const fetchCoordination = vi
      .fn()
      .mockResolvedValue({ heroes: ["updated-hero"] });

    const observer = new QueryObserver(queryClient, {
      queryKey: coordinationKey,
      queryFn: fetchCoordination,
    });

    const unsubscribe = observer.subscribe(() => {});
    onTestFinished(unsubscribe);

    const event = {
      v: 1,
      type: "event.hero-killed",
      data: {
        organizationId: "guild-1",
        payload: { guildId: "guild-1", eventId: "event-1" },
      },
    } as const;

    await act(async () => {
      gateway.deliver(event);
    });
    expect(fetchCoordination).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(coordinationKey)).toEqual({
      heroes: ["updated-hero"],
    });
    unmount();
    await act(async () => {
      gateway.deliver(event);
    });
    expect(fetchCoordination).toHaveBeenCalledTimes(1);
  });
});
