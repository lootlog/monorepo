// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { isMemberOnlineOnWeb } from "./member-web-presence.utils";
import { useMemberWebPresence } from "./use-member-web-presence";

const mockUseGateway = vi.fn();

vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => mockUseGateway(),
}));

describe("useMemberWebPresence", () => {
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

  it("fetches initial web presence from the gateway", async () => {
    emitSpy.mockImplementation((_, __, callback) => {
      callback?.({
        status: "success",
        sessions: {
          "discord-1": [{ sessionId: "session-1" }],
        },
      });
    });

    const { result } = renderHook(() => useMemberWebPresence("guild-1"));

    await waitFor(() => {
      expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(true);
    });

    expect(emitSpy).toHaveBeenCalledWith(
      GatewayEvent.MEMBER_WEB_PRESENCE_FETCH,
      { guildId: "guild-1" },
      expect.any(Function),
    );
  });

  it("applies online and offline web presence updates", async () => {
    emitSpy.mockImplementation((_, __, callback) => {
      callback?.({
        status: "success",
        sessions: {},
      });
    });

    const { result } = renderHook(() => useMemberWebPresence("guild-1"));

    await waitFor(() => {
      expect(result.current?.size).toBe(0);
    });

    act(() => {
      eventHandlers[GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE]?.({
        guildId: "guild-1",
        discordId: "discord-1",
        sessionId: "session-1",
        status: "online",
      });
    });

    expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(true);

    act(() => {
      eventHandlers[GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE]?.({
        guildId: "guild-1",
        discordId: "discord-1",
        sessionId: "session-1",
        status: "offline",
      });
    });

    expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(false);
  });
});
