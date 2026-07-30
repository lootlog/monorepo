// @vitest-environment happy-dom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useEventPresence, type PlayerPresence } from "./use-event-presence";

type SocketHandler = (payload: unknown) => void;
type PresenceCallback = (response: {
  status: "success";
  players: Record<string, PlayerPresence[]>;
}) => void;

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, Set<SocketHandler>>();
  const presenceCallbacks: PresenceCallback[] = [];

  return {
    handlers,
    presenceCallbacks,
    socket: {
      emit: vi.fn((event: string, ...args: unknown[]) => {
        if (event === "event-presence:fetch") {
          presenceCallbacks.push(args[args.length - 1] as PresenceCallback);
        }
      }),
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

const player: PlayerPresence = {
  world: "tempest",
  name: "Wild",
  characterId: "character-1",
  accountId: "account-1",
  icon: "wild.png",
  lvl: "300",
  prof: "w",
  mapId: 2354,
  mapName: "Sala Mroźnych Szeptów",
  isAfk: false,
  updatedAt: 1,
  sessionId: "session-1",
};

describe("useEventPresence", () => {
  beforeEach(() => {
    mocks.handlers.clear();
    mocks.presenceCallbacks.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the last presence snapshot while permissions are rebalanced", () => {
    const { result } = renderHook(() =>
      useEventPresence({ guildId: "guild-1", world: "tempest" }),
    );

    act(() => {
      mocks.presenceCallbacks[0]!({
        status: "success",
        players: { "user-1": [player] },
      });
    });

    expect(result.current.presenceData?.get("user-1")).toEqual([player]);
    expect(result.current.accessState).toBe("allowed");

    act(() => {
      mocks.socket.serverEmit(GatewayEvent.PERMISSIONS_UPDATED, {});
    });

    expect(result.current.presenceData?.get("user-1")).toEqual([player]);
    expect(result.current.accessState).toBe("allowed");
    expect(mocks.presenceCallbacks).toHaveLength(2);
  });
});
