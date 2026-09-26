import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type {
  PresenceWithLocation,
  ServerEvent,
} from "@lootlog/protocol/realtime";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
  type PresenceSnapshotData,
} from "@/features/online-players/online-players-test-fixtures";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import { getSocket } from "./socket";
import { getPlayersPresenceSource } from "./players-presence-source";

const policy = (location = true) =>
  createAccessPolicySnapshot(
    [
      {
        guild: { id: "guild-1", ownerId: "owner" },
        roles: [
          {
            permissions: [
              Permission.LOOTLOG_ONLINE_PLAYERS_READ,
              ...(location ? [Permission.LOOTLOG_PRESENCE_LOCATION_READ] : []),
            ],
            lvlRangeFrom: 1,
            lvlRangeTo: 300,
          },
        ],
      },
    ],
    "user",
  );

const delta = (...presences: PresenceWithLocation[]): ServerEvent => ({
  v: 1,
  type: "presence.delta",
  data: {
    organizationId: "guild-1",
    revision: 2,
    changes: presences.map((presence) => ({ action: "upsert", presence })),
  },
});

describe("shared presence map projection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shares one snapshot with rows and does no map notifications or animation work for a thousand same-map updates", async () => {
    const harness = createOnlinePlayersTest();
    getSocket().connect();
    harness.open();
    await harness.join(["guild-1"], policy());
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    const releaseRows = source.subscribe(() => {});
    await source.refresh();
    const release = source.retain();
    const changed = vi.fn();
    const unsubscribe = source.subscribeMap("Karka-han", changed);
    expect(source.isMapOccupied("Karka-han")).toBe(true);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    releaseRows();
    await Promise.resolve();
    const animationFrame = vi.spyOn(window, "requestAnimationFrame");
    await harness.receive(
      delta(
        ...Array.from({ length: 1000 }, (_, index) =>
          createOnlinePresence({
            lastSeen: index,
            isAfk: index % 2 === 0,
            location: { map: "Karka-han", x: index % 32, y: index % 24 },
          }),
        ),
      ),
    );
    expect(changed).not.toHaveBeenCalled();
    expect(animationFrame).not.toHaveBeenCalled();
    expect(source.isMapOccupied("Karka-han")).toBe(true);
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    unsubscribe();
    release();
  });

  it("keeps a map occupied until the last character leaves and ignores a replaced session's removal", async () => {
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
    await harness.join(["guild-1"], policy());
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
    await harness.receive(delta({ ...second, status: "offline" }));
    expect(changed).not.toHaveBeenCalled();
    expect(source.isMapOccupied("Karka-han")).toBe(true);
    await harness.receive(
      delta(
        createOnlinePresence({ sessionId: "replacement", status: "offline" }),
      ),
    );
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(source.isMapOccupied("Karka-han")).toBe(false);
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
    await harness.join(["guild-1"], policy());
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
    await harness.join(["guild-1"], policy());
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
    await harness.join(["guild-1"], policy());
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    await act(async () => pending.resolve(createPresenceSnapshot([])));
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    rows.unmount();
  });

  it("never infers location access from legacy map fields and removes occupancy when access is revoked", async () => {
    const harness = createOnlinePlayersTest();

    const rows = renderHook(() => usePlayersPresence("guild-1", "alpha"), {
      wrapper: harness.wrapper,
    });

    harness.open();
    await harness.join();
    await waitFor(() => expect(rows.result.current.hasLoaded).toBe(true));
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    expect(rows.result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
      "Karka-han",
    );
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    await harness.join(["guild-1"], policy());
    await waitFor(() => expect(source.isMapOccupied("Karka-han")).toBe(true));
    const changed = vi.fn();
    const unsubscribe = source.subscribeMap("Karka-han", changed);
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy(false),
      },
    });
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    expect(changed).toHaveBeenCalledOnce();
    await harness.receive(delta(createOnlinePresence()));
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    unsubscribe();
    rows.unmount();
  });
  it("hydrates a previously passive scope once and stops work when its last consumer leaves", async () => {
    const harness = createOnlinePlayersTest();
    getSocket().connect();
    harness.open();
    await harness.join(["guild-1"], policy());
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    const releasePassive = source.subscribeChanges(() => {}, false);
    expect(harness.fetchPresence).not.toHaveBeenCalled();
    const releaseFirst = source.retain();
    const releaseSecond = source.retain();
    await source.refresh();
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    expect(source.isMapOccupied("Karka-han")).toBe(true);
    releasePassive();
    releaseFirst();
    releaseSecond();
    await Promise.resolve();
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    const animationFrame = vi.spyOn(window, "requestAnimationFrame");
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    expect(animationFrame).not.toHaveBeenCalled();
    expect(source.isMapOccupied("Ithan")).toBe(false);
    const releaseAgain = source.retain();
    await source.refresh();
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
    expect(source.isMapOccupied("Karka-han")).toBe(true);
    releaseAgain();
  });

  it("ignores an abandoned snapshot after the same scope is retained again", async () => {
    const harness = createOnlinePlayersTest();
    getSocket().connect();
    harness.open();
    await harness.join(["guild-1"], policy());
    const old = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValueOnce(old.promise);
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    const releaseOld = source.retain();
    await waitFor(() => expect(harness.fetchPresence).toHaveBeenCalledTimes(1));
    releaseOld();
    await Promise.resolve();
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        createOnlinePresence({ location: { map: "Ithan" } }),
      ]),
    );
    const releaseNew = source.retain();
    await source.refresh();
    expect(source.isMapOccupied("Ithan")).toBe(true);
    old.resolve(createPresenceSnapshot());
    await Promise.resolve();
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    expect(source.isMapOccupied("Ithan")).toBe(true);
    releaseNew();
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
    await harness.join(["guild-1"], policy());
    await waitFor(() => expect(rows.result.current.isCurrent).toBe(true));
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    await harness.receive(delta(createOnlinePresence({ status: "offline" })));
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy(false),
      },
    });
    act(() => frame?.(16));
    expect(rows.result.current.onlinePlayers).toEqual({});
    expect(source.getCurrentSnapshot().onlinePlayers).toEqual({});
    expect(source.isMapOccupied("Karka-han")).toBe(false);
    rows.unmount();
  });
});
