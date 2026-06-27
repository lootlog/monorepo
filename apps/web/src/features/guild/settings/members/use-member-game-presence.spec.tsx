// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { isMemberOnlineInGame } from "./member-game-presence.utils";
import { useMemberGamePresence } from "./use-member-game-presence";

const mockUseGateway = vi.fn();

vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => mockUseGateway(),
}));

describe("useMemberGamePresence", () => {
  const eventHandlers: Record<string, (data: unknown) => void> = {};
  const emitSpy = vi.fn();
  const mockSocket = {
    emit(
      event: string,
      payload: { guildId: string },
      callback?: (response: unknown) => void,
    ) {
      emitSpy(event, payload, callback);
    },
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
      eventHandlers[event] = handler;
    }),
    off: vi.fn((event: string) => {
      delete eventHandlers[event];
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    for (const eventName of Object.keys(eventHandlers)) {
      delete eventHandlers[eventName];
    }

    mockUseGateway.mockReturnValue({
      socket: mockSocket,
      connected: true,
      joined: true,
    });
  });

  it("keeps current presence visible while a permissions refetch is pending", async () => {
    let pendingCallback: ((response: unknown) => void) | undefined;

    emitSpy
      .mockImplementationOnce((_, __, callback) => {
        callback?.({
          status: "success",
          players: {
            "discord-1": [
              {
                world: "alpha",
                name: "Hero",
                characterId: "10",
                accountId: "20",
                icon: "hero.png",
                lvl: "123",
                prof: "w",
                isAfk: false,
                updatedAt: 100,
                sessionId: "session-1",
              },
            ],
          },
        });
      })
      .mockImplementationOnce((_, __, callback) => {
        pendingCallback = callback;
      });

    const { result } = renderHook(() => useMemberGamePresence("guild-1"));

    await waitFor(() => {
      expect(isMemberOnlineInGame(result.current, "discord-1")).toBe(true);
    });

    act(() => {
      eventHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({});
    });

    expect(isMemberOnlineInGame(result.current, "discord-1")).toBe(true);

    act(() => {
      pendingCallback?.({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });
    });

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });
});
