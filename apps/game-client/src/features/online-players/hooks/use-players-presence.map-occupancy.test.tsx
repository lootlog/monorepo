import { Capability } from "@lootlog/schema/permissions";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
  type PresenceSnapshotData,
} from "@/test/online-players-fixtures";
import { getPlayersPresenceSource } from "@/lib/players-presence-source";
import { getSocket } from "@/lib/socket";
import { delta, fullPolicy, policy } from "./use-players-presence.fixtures";
import { usePlayersPresence } from "./use-players-presence";

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
                ? policy([Capability.LOOTLOG_ONLINE_PLAYERS_READ])
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
        accessPolicy: policy([Capability.LOOTLOG_ONLINE_PLAYERS_READ]),
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
        accessPolicy: policy([Capability.LOOTLOG_ONLINE_PLAYERS_READ]),
      },
    });
    act(() => frame?.(16));
    expect(rows.result.current.onlinePlayers).toEqual({});
    expect(source.getCurrentSnapshot().onlinePlayers).toEqual({});
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    rows.unmount();
  });
});
