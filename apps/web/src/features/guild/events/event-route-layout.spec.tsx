// @vitest-environment happy-dom

import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  getListEventMapsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { EventRouteLayout } from "./event-route-layout";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each(["guild-1", "guild-alias"])(
  "resolves %s to its Organization before processing realtime events",
  async (routeGuildId) => {
    const gateway = createTestGateway();
    const GatewayWrapper = gateway.wrapper;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });

    onTestFinished(() => queryClient.clear());
    queryClient.setQueryData(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      [
        {
          id: "guild-1",
          name: "Test guild",
          vanityUrl: "guild-alias",
          ownerId: "owner-1",
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ] satisfies UserCurrentGuildResponseDtoOutput[],
    );

    const mapsKey = getListEventMapsQueryKey({
      guildId: routeGuildId,
      eventId: "event-1",
    });

    queryClient.setQueryData(mapsKey, { heroNpcs: [] });
    const root = createRootRoute();

    const eventRoute = createRoute({
      getParentRoute: () => root,
      path: "/$guildId/events/$eventId",
      component: EventRouteLayout,
    });

    const router = createRouter({
      routeTree: root.addChildren([eventRoute]),
      history: createMemoryHistory({
        initialEntries: [`/${routeGuildId}/events/event-1`],
      }),
    });

    await router.load();
    render(
      <GatewayWrapper>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </GatewayWrapper>,
    );

    act(() =>
      gateway.deliver({
        v: 1,
        type: "event.map-status-updated",
        data: {
          organizationId: "guild-1",
          payload: { guildId: "guild-1", eventId: "event-1", mapId: "map-1" },
        },
      }),
    );

    expect(queryClient.getQueryState(mapsKey)?.isInvalidated).toBe(true);
  },
);
