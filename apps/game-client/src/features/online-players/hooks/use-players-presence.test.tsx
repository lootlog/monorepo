import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { usePlayersPresence } from "./use-players-presence";

const mockUseSocket = vi.fn();

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => mockUseSocket(),
}));

describe("usePlayersPresence", () => {
  const eventHandlers: Record<string, (data: unknown) => void> = {};
  const emitWithAckSpy = vi.fn();
  const mockSocket = {
    emitWithAck(event: string, payload: { guildId: string; world: string }) {
      return emitWithAckSpy(event, payload, this);
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

    mockUseSocket.mockReturnValue({
      socket: mockSocket,
      connected: true,
      joined: true,
      joinedGuilds: ["guild-1"],
    });
  });

  it("normalizes initial presence fetch payloads from player location", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        "discord-1": [
          {
            discordId: "discord-1",
            platform: "game",
            player: {
              world: "alpha",
              name: "Hero",
              lvl: "123",
              icon: "hero.png",
              characterId: "10",
              accountId: "20",
              prof: "w",
              location: {
                x: 1,
                y: 2,
                map: "Karka-han",
              },
            },
          },
        ],
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]?.[0]?.mapName).toBe("Karka-han");
    });

    expect(result.current[0]["discord-1"]?.[0]?.player?.lvl).toBe(123);
    expect(result.current[0]["discord-1"]?.[0]?.player?.location?.map).toBe(
      "Karka-han",
    );
    expect(result.current[3]["20-10"]).toEqual({
      status: "online",
      mapName: "Karka-han",
    });
    expect(emitWithAckSpy).toHaveBeenCalledWith(
      GatewayEvent.REQUEST_SERVER_PRESENCE,
      {
        guildId: "guild-1",
        world: "alpha",
      },
      mockSocket,
    );
  });

  it("updates existing presence entries from gateway mapName updates without status", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        "discord-1": [
          {
            discordId: "discord-1",
            platform: "game",
            player: {
              world: "alpha",
              name: "Hero",
              lvl: "123",
              icon: "hero.png",
              characterId: "10",
              accountId: "20",
              prof: "w",
              location: {
                map: "Karka-han",
              },
            },
          },
        ],
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]?.[0]?.mapName).toBe("Karka-han");
    });

    act(() => {
      eventHandlers[GatewayEvent.UPDATE_SERVER_PRESENCE]?.({
        guildId: "guild-1",
        discordId: "discord-1",
        player: {
          world: "alpha",
          name: "Hero",
          lvl: 123,
          icon: "hero.png",
          characterId: "10",
          accountId: "20",
          prof: "w",
          mapName: "Ithan",
          sessionId: "session-1",
        },
      });
    });

    expect(result.current[0]["discord-1"]?.[0]?.mapName).toBe("Ithan");
    expect(result.current[0]["discord-1"]?.[0]?.player?.location?.map).toBe(
      "Ithan",
    );
    expect(result.current[3]["20-10"]).toEqual({
      status: "online",
      mapName: "Ithan",
    });
  });

  it("stores an offline tombstone when gateway reports offline status", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        "discord-1": [
          {
            discordId: "discord-1",
            platform: "game",
            player: {
              world: "alpha",
              name: "Hero",
              lvl: "123",
              icon: "hero.png",
              characterId: "10",
              accountId: "20",
              prof: "w",
              location: {
                map: "Karka-han",
              },
            },
          },
        ],
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]).toHaveLength(1);
    });

    act(() => {
      eventHandlers[GatewayEvent.UPDATE_SERVER_PRESENCE]?.({
        guildId: "guild-1",
        discordId: "discord-1",
        status: "offline",
        player: {
          world: "alpha",
          name: "Hero",
          lvl: 123,
          icon: "hero.png",
          characterId: "10",
          accountId: "20",
          prof: "w",
          mapName: "Ithan",
          sessionId: "session-1",
        },
      });
    });

    expect(result.current[0]["discord-1"]).toBeUndefined();
    expect(result.current[3]["20-10"]).toEqual({
      status: "offline",
      mapName: "Karka-han",
    });
  });
});
