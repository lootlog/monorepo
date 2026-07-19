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
    timeout: vi.fn(() => mockSocket),
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
        status: "success",
        players: {
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
                clan: {
                  id: 15191,
                  name: "Karhu",
                  rank: 100,
                },
                location: {
                  x: 1,
                  y: 2,
                  map: "Karka-han",
                },
              },
              playerPresence: {
                world: "alpha",
                name: "Hero",
                lvl: "123",
                icon: "hero.png",
                characterId: "10",
                accountId: "20",
                prof: "w",
                mapName: "Karka-han",
                isAfk: true,
                sessionId: "session-1",
              },
            },
          ],
        },
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
    expect(result.current[0]["discord-1"]?.[0]?.player?.clan).toEqual({
      id: 15191,
      name: "Karhu",
      rank: 100,
    });
    expect(result.current[0]["discord-1"]?.[0]?.isAfk).toBe(true);
    expect(result.current[0]["discord-1"]?.[0]?.sessionId).toBe("session-1");
    expect(emitWithAckSpy).toHaveBeenCalledWith(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH,
      {
        guildId: "guild-1",
        world: "alpha",
      },
      mockSocket,
    );
  });

  it("deduplicates initial presence fetch payloads by character and keeps the newest presence", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        status: "success",
        players: {
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
                mapName: "Karka-han",
                isAfk: false,
                updatedAt: 100,
              },
            },
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
                mapName: "Ithan",
                isAfk: true,
                updatedAt: 200,
              },
            },
            {
              discordId: "discord-1",
              platform: "game",
              player: {
                world: "alpha",
                name: "Scout",
                lvl: "80",
                icon: "scout.png",
                characterId: "11",
                accountId: "21",
                prof: "h",
                mapName: "Torneg",
                isAfk: false,
                updatedAt: 150,
              },
            },
          ],
        },
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]).toHaveLength(2);
    });

    expect(
      result.current[0]["discord-1"]?.map((presence) => presence.mapName),
    ).toEqual(["Ithan", "Torneg"]);
    expect(result.current[0]["discord-1"]?.[0]?.isAfk).toBe(true);
    expect(result.current[0]["discord-1"]?.[0]?.updatedAt).toBe(200);
  });

  it("updates existing presence entries from gateway mapName updates without status", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        status: "success",
        players: {
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
        },
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]?.[0]?.mapName).toBe("Karka-han");
    });

    act(() => {
      eventHandlers[GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE]?.({
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
          clan: {
            id: 15191,
            name: "Karhu",
            rank: 100,
          },
          mapName: "Ithan",
          isAfk: true,
          sessionId: "session-1",
        },
      });
    });

    expect(result.current[0]["discord-1"]?.[0]?.mapName).toBe("Ithan");
    expect(result.current[0]["discord-1"]?.[0]?.isAfk).toBe(true);
    expect(result.current[0]["discord-1"]?.[0]?.player?.location?.map).toBe(
      "Ithan",
    );
    expect(result.current[0]["discord-1"]?.[0]?.player?.clan).toEqual({
      id: 15191,
      name: "Karhu",
      rank: 100,
    });
  });

  it("stores an offline tombstone when gateway reports offline status", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        status: "success",
        players: {
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
        },
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]).toHaveLength(1);
    });

    act(() => {
      eventHandlers[GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE]?.({
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
  });

  it("clears players and exposes forbidden access state when gateway denies access", async () => {
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      }),
    );

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[3]).toBe("forbidden");
    });

    expect(result.current[0]).toEqual({});
  });

  it("refetches and clears stale players after permissions are updated", async () => {
    let resolvePermissionsRefetch: (
      value: Awaited<ReturnType<typeof emitWithAckSpy>>,
    ) => void;
    const permissionsRefetchPromise = new Promise((resolve) => {
      resolvePermissionsRefetch = resolve;
    });

    emitWithAckSpy
      .mockImplementationOnce(() =>
        Promise.resolve({
          status: "success",
          players: {
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
                },
              },
            ],
          },
        }),
      )
      .mockImplementationOnce(() => permissionsRefetchPromise);

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    await waitFor(() => {
      expect(result.current[0]["discord-1"]).toHaveLength(1);
    });

    act(() => {
      eventHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({});
    });

    expect(result.current[0]["discord-1"]).toHaveLength(1);

    await act(async () => {
      resolvePermissionsRefetch!({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });
      await permissionsRefetchPromise;
    });

    await waitFor(() => {
      expect(result.current[3]).toBe("forbidden");
    });

    expect(result.current[0]).toEqual({});
  });
});
