// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getListEventMapsQueryKey } from "@lootlog/api-client/react-query/main/events";
import { GatewayEvent } from "@/config/gateway";
import { useEventSocket } from "./use-event-socket";

type SocketHandler = (payload: unknown) => void;

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, Set<SocketHandler>>();

  return {
    handlers,
    socket: {
      off: vi.fn((event: string, handler: SocketHandler) => {
        handlers.get(event)?.delete(handler);
      }),
      on: vi.fn((event: string, handler: SocketHandler) => {
        const eventHandlers = handlers.get(event) ?? new Set();
        eventHandlers.add(handler);
        handlers.set(event, eventHandlers);
      }),
      serverEmit: (event: string, payload: unknown) => {
        handlers.get(event)?.forEach((handler) => handler(payload));
      },
    },
  };
});

vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => ({
    connected: true,
    joined: true,
    socket: mocks.socket,
  }),
}));

describe("useEventSocket", () => {
  beforeEach(() => {
    mocks.handlers.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("invalidates event maps after socket rooms are rebalanced", () => {
    const queryClient = new QueryClient();
    const eventMapsQueryKey = getListEventMapsQueryKey({
      guildId: "guild-1",
      eventId: "event-1",
    });
    queryClient.setQueryData(eventMapsQueryKey, { heroNpcs: [] });

    const QueryWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () => useEventSocket({ guildId: "guild-1", eventId: "event-1" }),
      { wrapper: QueryWrapper },
    );

    expect(queryClient.getQueryState(eventMapsQueryKey)?.isInvalidated).toBe(
      false,
    );

    act(() => {
      mocks.socket.serverEmit(GatewayEvent.PERMISSIONS_UPDATED, {});
    });

    expect(queryClient.getQueryState(eventMapsQueryKey)?.isInvalidated).toBe(
      true,
    );
  });
});
