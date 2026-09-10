import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type {
  PresenceWithLocation,
  ServerEvent,
} from "@lootlog/protocol/realtime";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePresenceResponse } from "@/lib/online-players-presence";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
  type PresenceSnapshotData,
} from "../online-players-test-fixtures";
import { usePlayersPresence } from "./use-players-presence";

const policy = (permissions: Permission[], organizationIds = ["guild-1"]) =>
  createAccessPolicySnapshot(
    organizationIds.map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [{ permissions, lvlRangeFrom: 1, lvlRangeTo: 300 }],
    })),
    "user",
  );

const fullPolicy = () =>
  policy([
    Permission.LOOTLOG_ONLINE_PLAYERS_READ,
    Permission.LOOTLOG_PRESENCE_LOCATION_READ,
  ]);

const permissionEvent = (
  accessPolicy: ReturnType<typeof policy>,
): ServerEvent => ({
  v: 1,
  type: "permissions.updated",
  data: {
    organizationIds: accessPolicy.organizations.map(
      (row) => row.organizationId,
    ),
    subscriptionScopes: [],
    accessPolicy,
  },
});

const delta = (...presences: PresenceWithLocation[]): ServerEvent => ({
  v: 1,
  type: "presence.delta",
  data: {
    organizationId: "guild-1",
    revision: 2,
    changes: presences.map((presence) => ({ action: "upsert", presence })),
  },
});

describe("usePlayersPresence", () => {
  let harness: ReturnType<typeof createOnlinePlayersTest>;
  beforeEach(() => {
    harness = createOnlinePlayersTest();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mount = async (withPolicy = true) => {
    const result = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join(["guild-1"], withPolicy ? fullPolicy() : undefined);

    return result;
  };

  it("normalizes initial presence fetch payloads from player location", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([createOnlinePresence({ isAfk: true })]),
    );
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.onlinePlayers["discord-1"]?.[0]).toMatchObject({
      mapName: "Karka-han",
      isAfk: true,
      sessionId: "session-1",
      player: {
        lvl: 123,
        location: { map: "Karka-han" },
        clan: { id: 15191, name: "Karhu", rank: 100 },
      },
    });
    expect(harness.fetchPresence).toHaveBeenCalledWith("guild-1", "alpha");
  });

  it("retains numeric-string compatibility in the legacy presence normalizer", () => {
    const normalized = normalizePresenceResponse({
      "discord-1": [
        {
          discordId: "discord-1",
          player: {
            world: "alpha",
            name: "Hero",
            lvl: "123",
            characterId: "10",
            accountId: "20",
            icon: "hero.png",
            prof: "w",
            location: { map: "Karka-han" },
          },
        },
      ],
    });

    expect(normalized["discord-1"]?.[0]?.player?.lvl).toBe(123);
  });

  it("deduplicates initial presence fetch payloads by character and keeps the newest presence", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        createOnlinePresence({ lastSeen: 1, location: { map: "Old" } }),
        createOnlinePresence({ lastSeen: 2, location: { map: "New" } }),
      ]),
    );
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe("New");
  });

  it("updates existing presence entries from gateway locations", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Ithan",
      ),
    );
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
  });

  it("preserves untouched account references during a presence update", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        createOnlinePresence(),
        createOnlinePresence({
          userId: "user-2",
          discordId: "discord-2",
          sessionId: "session-2",
        }),
      ]),
    );
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const untouched = result.current.onlinePlayers["discord-2"];
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Ithan",
      ),
    );
    expect(result.current.onlinePlayers["discord-2"]).toBe(untouched);
  });

  it("coalesces gateway update bursts into one render per animation frame", async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;

      return 1;
    });
    let renders = 0;

    const { result } = renderHook(
      () => {
        renders++;

        return usePlayersPresence("guild-1", "alpha");
      },
      { wrapper: harness.wrapper },
    );

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const before = renders;
    await harness.receive(
      delta(
        ...Array.from({ length: 15 }, (_, index) =>
          createOnlinePresence({ location: { map: `Map ${index}` } }),
        ),
      ),
    );
    expect(renders).toBe(before);
    act(() => frame?.(16));
    expect(renders).toBe(before + 1);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
      "Map 14",
    );
  });

  it("removes the row when gateway reports offline status", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(delta(createOnlinePresence({ status: "offline" })));
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]).toBeUndefined(),
    );
  });

  it("removes the matching session without deleting another character or organization", async () => {
    const other = createOnlinePresence({
      sessionId: "session-2",
      character: {
        world: "alpha",
        name: "Other",
        lvl: 100,
        characterId: "11",
        accountId: "20",
        icon: "hero.png",
        prof: "w",
      },
    });

    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([createOnlinePresence(), other]),
    );
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    const remove = (organizationId: string): ServerEvent => ({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId,
        revision: 2,
        changes: [
          {
            action: "remove",
            userId: "user-1",
            discordId: "discord-1",
            sessionId: "session-1",
          },
        ],
      },
    });

    await harness.receive(remove("guild-2"));
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(2);
    await harness.receive(remove("guild-1"));
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1),
    );
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
      "session-2",
    );
  });

  it("preserves a replacement session when a late removal names its predecessor", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(
      delta(createOnlinePresence({ sessionId: "replacement" })),
    );
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
        "replacement",
      ),
    );
    await harness.receive({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId: "guild-1",
        revision: 3,
        changes: [
          {
            action: "remove",
            userId: "user-1",
            discordId: "discord-1",
            sessionId: "session-1",
          },
        ],
      },
    });
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
      "replacement",
    );
  });

  it.each([false, true])(
    "applies session removals in order with queued creates (recreated: %s)",
    async (recreated) => {
      let frame: FrameRequestCallback | undefined;
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (callback) => {
          frame = callback;

          return 1;
        },
      );
      harness.fetchPresence.mockResolvedValue(createPresenceSnapshot([]));
      const { result } = await mount();
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));

      const removal: ServerEvent = {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "guild-1",
          revision: 3,
          changes: [
            {
              action: "remove",
              userId: "user-1",
              discordId: "discord-1",
              sessionId: "session-1",
            },
          ],
        },
      };

      await harness.receive(delta(createOnlinePresence()), removal);

      if (recreated) await harness.receive(delta(createOnlinePresence()));
      act(() => frame?.(16));
      expect(result.current.onlinePlayers["discord-1"]?.length ?? 0).toBe(
        recreated ? 1 : 0,
      );
    },
  );

  it("clears players and exposes forbidden access state when gateway denies access", async () => {
    harness.fetchPresence.mockRejectedValue(new Error("denied"));
    const { result } = await mount();
    await waitFor(() => expect(result.current.accessState).toBe("forbidden"));
    expect(result.current.onlinePlayers).toEqual({});
  });

  it("exposes a retryable error when both acknowledgement deadlines expire", async () => {
    vi.useFakeTimers();
    harness.fetchPresence.mockReturnValue(
      new Promise<PresenceSnapshotData>(() => {}),
    );
    const { result } = await mount();
    expect(result.current.initialLoading).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasLoaded).toBe(false);
    act(() => result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(4);
  });

  it("keeps loaded players and marks them stale after disconnecting", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    act(() => harness.realtime.disconnect());
    expect(result.current.stale).toBe(true);
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
  });

  it("hides the previous scope while the next scope is loading", async () => {
    let guildId = "guild-1";

    const { result, rerender } = renderHook(
      () => usePlayersPresence(guildId, "alpha"),
      { wrapper: harness.wrapper },
    );

    harness.open();
    await harness.join(
      ["guild-1", "guild-2"],
      policy(
        [
          Permission.LOOTLOG_ONLINE_PLAYERS_READ,
          Permission.LOOTLOG_PRESENCE_LOCATION_READ,
        ],
        ["guild-1", "guild-2"],
      ),
    );
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const response = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValue(response.promise);
    guildId = "guild-2";
    rerender();
    expect(result.current.onlinePlayers).toEqual({});
    expect(result.current.initialLoading).toBe(true);
    response.resolve({
      ...createPresenceSnapshot([]),
      organizationId: "guild-2",
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  });

  it("coalesces legacy permission updates and clears stale players before a denied refetch", async () => {
    const { result } = await mount(false);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    vi.useFakeTimers();
    harness.fetchPresence.mockRejectedValue(new Error("denied"));

    const event: ServerEvent = {
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: ["guild-1"], subscriptionScopes: [] },
    };

    await harness.receive(event, event);
    expect(result.current.onlinePlayers).toEqual({});
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
    expect(result.current.accessState).toBe("forbidden");
  });

  it("keeps rows for unrelated changes, scrubs revoked location, and ignores the old request", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const rows = result.current.onlinePlayers;
    await harness.receive(
      permissionEvent(
        policy(
          [
            Permission.LOOTLOG_ONLINE_PLAYERS_READ,
            Permission.LOOTLOG_PRESENCE_LOCATION_READ,
          ],
          ["guild-1", "guild-2"],
        ),
      ),
    );
    expect(result.current.onlinePlayers).toBe(rows);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    const response = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValue(response.promise);
    act(() => result.current.retry());
    await waitFor(() => expect(harness.fetchPresence).toHaveBeenCalledTimes(2));
    await harness.receive(
      permissionEvent(policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.name).toBe(
      "Hero",
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location,
    ).toBeUndefined();
    await act(async () => {
      response.resolve(createPresenceSnapshot());
      await response.promise;
    });
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.mapName,
    ).toBeUndefined();
    expect(result.current.hasLoaded).toBe(true);
  });

  it("coalesces expansions for five seconds without clearing loaded rows", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(
      permissionEvent(policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    const rows = result.current.onlinePlayers;
    vi.useFakeTimers();
    await harness.receive(
      permissionEvent(fullPolicy()),
      permissionEvent(fullPolicy()),
    );
    await act(() => vi.advanceTimersByTimeAsync(4999));
    expect(result.current.onlinePlayers).toBe(rows);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
  });

  it("filters live presence before an animation frame commits and rejects revoked access", async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;

      return 1;
    });
    harness.fetchPresence.mockResolvedValue(createPresenceSnapshot([]));
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(delta(createOnlinePresence()));
    await harness.receive(
      permissionEvent(policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    act(() => frame?.(16));
    expect(result.current.onlinePlayers).toEqual({});
    await harness.receive(delta(createOnlinePresence()));
    act(() => frame?.(24));
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.name).toBe(
      "Hero",
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location,
    ).toBeUndefined();
    await harness.receive(delta(createOnlinePresence()));
    act(() => frame?.(32));
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.mapName,
    ).toBeUndefined();
    await harness.receive(
      permissionEvent(policy([])),
      delta(createOnlinePresence()),
    );
    expect(result.current.onlinePlayers).toEqual({});
    await harness.receive(permissionEvent(fullPolicy()));
    act(() => frame?.(48));
    expect(result.current.onlinePlayers).toEqual({});
  });
});
