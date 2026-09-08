// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getListEventMapsQueryKey } from "@lootlog/client/main";
import { createTestGateway } from "@/lib/testing/gateway";
import { useEventSocket } from "./use-event-socket";

describe("useEventSocket", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("invalidates event maps after socket rooms are rebalanced", () => {
    const gateway = createTestGateway();
    const GatewayWrapper = gateway.wrapper;
    const queryClient = new QueryClient();
    const eventMapsQueryKey = getListEventMapsQueryKey({
      guildId: "guild-1",
      eventId: "event-1",
    });
    queryClient.setQueryData(eventMapsQueryKey, { heroNpcs: [] });

    const QueryWrapper = ({ children }: { children: ReactNode }) => (
      <GatewayWrapper>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </GatewayWrapper>
    );

    renderHook(
      () => useEventSocket({ guildId: "guild-1", eventId: "event-1" }),
      { wrapper: QueryWrapper },
    );

    expect(queryClient.getQueryState(eventMapsQueryKey)?.isInvalidated).toBe(
      false,
    );

    act(() => {
      gateway.deliver({
        v: 1,
        type: "permissions.updated",
        data: { organizationIds: [], subscriptionScopes: [] },
      });
    });

    expect(queryClient.getQueryState(eventMapsQueryKey)?.isInvalidated).toBe(
      true,
    );
    queryClient.clear();
  });
});
