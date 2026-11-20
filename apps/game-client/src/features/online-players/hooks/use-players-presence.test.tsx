import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type {
  PresenceWithLocation,
  ServerEvent,
} from "@lootlog/protocol/realtime";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
  type PresenceSnapshotData,
} from "@/test/online-players-fixtures";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
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
    changes: [],
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
    await act(() => vi.advanceTimersByTimeAsync(13_000));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasLoaded).toBe(false);
    act(() => result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(8_000));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(4);
  });

  it("keeps loaded players after disconnecting", async () => {
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    act(() => harness.realtime.disconnect());
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    expect(result.current.disconnected).toBe(false);
  });

  it("treats the first gateway connection as loading, not as a lost connection", () => {
    const { result } = renderHook(
      () => usePlayersPresence("guild-1", "alpha"),
      { wrapper: harness.wrapper },
    );

    expect(result.current.initialLoading).toBe(true);
    expect(result.current.disconnected).toBe(false);
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
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.name).toBe(
      "Hero",
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.mapName,
    ).toBeUndefined();
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location,
    ).toBeUndefined();
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

describe("shared presence map projection with rows", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps a map occupied until the last character leaves, lists who remains, and ignores a replaced session's removal", async () => {
    const harness = createOnlinePlayersTest();
    const first = createOnlinePresence();

    if (!first.character) throw new Error("Missing character");

    const second = createOnlinePresence({
      sessionId: "other",
      character: { ...first.character, characterId: "11" },
    });

    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([first, second]),
    );

    const rows = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    const changed = vi.fn();
    const unsubscribe = source.subscribeMap("Karka-han", changed);
    await harness.receive(
      delta(createOnlinePresence({ sessionId: "replacement" })),
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
    expect(changed).not.toHaveBeenCalled();
    expect(source.isOnlineMember("10")).toBe(true);
    await harness.receive(delta({ ...second, status: "offline" }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(source.getMapOccupancy("Karka-han")?.players).toHaveLength(1);
    expect(source.isOnlineMember("11")).toBe(false);
    await harness.receive(
      delta(
        createOnlinePresence({ sessionId: "replacement", status: "offline" }),
      ),
    );
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(2));
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    expect(source.isOnlineMember("10")).toBe(false);
    unsubscribe();
    rows.unmount();
  });

  it("replays a move received during snapshot loading instead of restoring the old occupied map", async () => {
    const harness = createOnlinePlayersTest();
    const pending = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValue(pending.promise);

    const rows = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    expect(source.isMapOccupied("Ithan")).toBe(false);
    await act(async () => pending.resolve(createPresenceSnapshot()));
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    expect(source.isMapOccupied("Ithan")).toBe(true);
    expect(rows.result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
      "Ithan",
    );
    rows.unmount();
  });

  it("keeps stale rows while hiding occupancy until a new connection snapshot succeeds", async () => {
    const harness = createOnlinePlayersTest();

    const rows = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    act(() => harness.realtime.disconnect());
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    expect(rows.result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    expect(rows.result.current.isCurrent).toBe(false);
    const pending = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValue(pending.promise);
    act(() => getSocket().connect());
    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    await act(async () => pending.resolve(createPresenceSnapshot([])));
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    rows.unmount();
  });

  it.each(["disconnect", "location revocation", "organization removal"])(
    "invalidates occupied maps during refresh after %s and ignores its delayed snapshot",
    async (invalidation) => {
      const harness = createOnlinePlayersTest();
      getSocket().connect();
      harness.open();
      await harness.join(["guild-1"], fullPolicy());
      const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
      const release = source.retain();
      await source.refresh();
      const pending = Promise.withResolvers<PresenceSnapshotData>();
      harness.fetchPresence.mockReturnValue(pending.promise);
      const refresh = source.refresh();
      expect(source.isMapOccupied("Karka-han")).toBe(true);

      if (invalidation === "disconnect") {
        harness.realtime.disconnect();
      } else {
        await harness.receive({
          v: 1,
          type: "permissions.updated",
          data: {
            changes: [],
            organizationIds: ["guild-1"],
            subscriptionScopes: [],
            accessPolicy:
              invalidation === "location revocation"
                ? policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ])
                : createAccessPolicySnapshot([], "user"),
          },
        });
      }

      expect(source.isMapOccupied("Karka-han")).toBe(false);
      pending.resolve(createPresenceSnapshot());
      await refresh;
      expect(source.isMapOccupied("Karka-han")).toBe(false);

      if (invalidation !== "disconnect") {
        await harness.receive(delta(createOnlinePresence()));
      }

      expect(source.isMapOccupied("Karka-han")).toBe(false);
      release();
    },
  );

  it("removes occupancy when location access is revoked", async () => {
    const harness = createOnlinePlayersTest();

    const rows = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    await waitFor(() => expect(source.isMapOccupied("Karka-han")).toBe(true));
    const changed = vi.fn();
    const unsubscribe = source.subscribeMap("Karka-han", changed);
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        changes: [],
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      },
    });
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    expect(changed).toHaveBeenCalledOnce();
    await harness.receive(delta(createOnlinePresence()));
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    unsubscribe();
    rows.unmount();
  });
  it("does not resurrect an offline character when location access is revoked before the row frame commits", async () => {
    const harness = createOnlinePlayersTest();
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;

      return 1;
    });

    const rows = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    await harness.receive(delta(createOnlinePresence({ status: "offline" })));
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        changes: [],
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy([Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
      },
    });
    act(() => frame?.(16));
    expect(rows.result.current.onlinePlayers).toEqual({});
    expect(source.getCurrentSnapshot().onlinePlayers).toEqual({});
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    rows.unmount();
  });
});
