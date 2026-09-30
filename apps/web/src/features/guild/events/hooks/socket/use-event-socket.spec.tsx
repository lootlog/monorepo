// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  QueryObserver,
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

  it("refreshes member-history and detail points after another member edits the ranking", async () => {
    const { gateway, queryClient } = setup();

    const eventPath = "/guilds/guild-alias/events/event-1";

    const affectedKeys = [
      [`${eventPath}/kill-history`, { memberId: "member-1" }],
      [`${eventPath}/heroes/hero-1/kills/kill-1`],
      [`${eventPath}/ranking`],
    ];

    const unrelatedKeys = [
      ["/guilds/guild-alias/events/event-2/kill-history"],
      ["/guilds/other-guild/events/event-1/kill-history"],
      coordinationKey,
    ];

    for (const queryKey of [...affectedKeys, ...unrelatedKeys]) {
      queryClient.setQueryData(queryKey, { points: 2 });

      const observer = new QueryObserver(queryClient, {
        queryKey,
        queryFn: async () => ({ points: 7 }),
      });

      onTestFinished(observer.subscribe(() => {}));
    }

    await act(async () =>
      gateway.deliver({
        v: 1,
        type: "event.ranking-updated",
        data: {
          organizationId: "guild-1",
          payload: { guildId: "guild-1", eventId: "event-1" },
        },
      }),
    );

    for (const queryKey of affectedKeys)
      expect(queryClient.getQueryData(queryKey)).toEqual({ points: 7 });

    for (const queryKey of unrelatedKeys)
      expect(queryClient.getQueryData(queryKey)).toEqual({ points: 2 });
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
