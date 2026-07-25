import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => {
    vi.restoreAllMocks();
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
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Karka-han",
      );
    });

    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.lvl).toBe(
      123,
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location?.map,
    ).toBe("Karka-han");
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.clan,
    ).toEqual({
      id: 15191,
      name: "Karhu",
      rank: 100,
    });
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.isAfk).toBe(true);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
      "session-1",
    );
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
      expect(result.current.onlinePlayers["discord-1"]).toHaveLength(2);
    });

    expect(
      result.current.onlinePlayers["discord-1"]?.map(
        (presence) => presence.mapName,
      ),
    ).toEqual(["Ithan", "Torneg"]);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.isAfk).toBe(true);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.updatedAt).toBe(200);
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
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Karka-han",
      );
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

    await waitFor(() => {
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Ithan",
      );
    });
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.isAfk).toBe(true);
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location?.map,
    ).toBe("Ithan");
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.clan,
    ).toEqual({
      id: 15191,
      name: "Karhu",
      rank: 100,
    });
  });

  it("preserves untouched account references during a presence update", async () => {
    const createPlayer = (discordId: string, characterId: string) => ({
      discordId,
      platform: "game",
      player: {
        accountId: characterId,
        characterId,
        icon: "hero.png",
        lvl: 123,
        mapName: "Karka-han",
        name: `Hero ${characterId}`,
        prof: "w",
        world: "alpha",
      },
    });
    emitWithAckSpy.mockImplementation(() =>
      Promise.resolve({
        status: "success",
        players: {
          "discord-1": [createPlayer("discord-1", "10")],
          "discord-2": [createPlayer("discord-2", "20")],
        },
      }),
    );
    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));
    await waitFor(() => {
      expect(result.current.onlinePlayers["discord-2"]).toHaveLength(1);
    });
    const untouchedAccount = result.current.onlinePlayers["discord-2"];

    act(() => {
      eventHandlers[GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE]?.({
        guildId: "guild-1",
        discordId: "discord-1",
        player: {
          ...createPlayer("discord-1", "10").player,
          mapName: "Ithan",
        },
      });
    });

    expect(result.current.onlinePlayers["discord-2"]).toBe(untouchedAccount);
  });

  it("coalesces gateway update bursts into one render per animation frame", async () => {
    let renderCount = 0;
    let scheduledFrame: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        scheduledFrame = callback;
        return 1;
      });
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
                lvl: 123,
                icon: "hero.png",
                characterId: "10",
                accountId: "20",
                prof: "w",
                mapName: "Karka-han",
              },
            },
          ],
        },
      }),
    );
    const { result } = renderHook(() => {
      renderCount += 1;
      return usePlayersPresence("guild-1", "alpha");
    });
    await waitFor(() => {
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Karka-han",
      );
    });
    const renderCountBeforeBurst = renderCount;

    act(() => {
      for (const mapName of ["Ithan", "Torneg", "Karka-han II"]) {
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
            mapName,
          },
        });
      }
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(renderCount).toBe(renderCountBeforeBurst);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
      "Karka-han",
    );

    act(() => {
      scheduledFrame?.(16);
    });

    expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
      "Karka-han II",
    );
    expect(renderCount).toBe(renderCountBeforeBurst + 1);
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
      expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
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

    await waitFor(() => {
      expect(result.current.onlinePlayers["discord-1"]).toBeUndefined();
    });
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
      expect(result.current.accessState).toBe("forbidden");
    });

    expect(result.current.onlinePlayers).toEqual({});
  });

  it("exposes a retryable error when the initial presence request fails", async () => {
    emitWithAckSpy.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => usePlayersPresence("guild-1", "alpha"));

    expect(result.current.initialLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasLoaded).toBe(false);

    act(() => result.current.retry());

    await waitFor(() => {
      expect(emitWithAckSpy).toHaveBeenCalledTimes(4);
    });
  });

  it("keeps loaded players and marks them stale after disconnecting", async () => {
    emitWithAckSpy.mockResolvedValue({
      status: "success",
      players: {
        "discord-1": [
          {
            discordId: "discord-1",
            platform: "game",
            player: {
              world: "alpha",
              name: "Hero",
              lvl: 123,
              icon: "hero.png",
              characterId: "10",
              accountId: "20",
              prof: "w",
            },
          },
        ],
      },
    });

    const { result, rerender } = renderHook(() =>
      usePlayersPresence("guild-1", "alpha"),
    );

    await waitFor(() => {
      expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    });

    mockUseSocket.mockReturnValue({
      socket: mockSocket,
      connected: false,
      joined: false,
      joinedGuilds: [],
    });
    rerender();

    expect(result.current.stale).toBe(true);
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
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
      expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    });

    act(() => {
      eventHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({});
    });

    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);

    await act(async () => {
      if (!resolvePermissionsRefetch) {
        throw new Error("Expected permissions refetch resolver");
      }
      resolvePermissionsRefetch({
        status: "forbidden",
        code: "ONLINE_PLAYERS_ACCESS_DENIED",
      });
      await permissionsRefetchPromise;
    });

    await waitFor(() => {
      expect(result.current.accessState).toBe("forbidden");
    });

    expect(result.current.onlinePlayers).toEqual({});
  });
});
