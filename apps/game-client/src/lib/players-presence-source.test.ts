import { publishedPresence } from "@/test/realtime-wire";
import { act, waitFor } from "@testing-library/react";
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
} from "@/test/online-players-fixtures";
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

  it("reads a Lootlog as soon as this character becomes visible there, without the policy debounce", async () => {
    const harness = createOnlinePlayersTest();
    getSocket().connect();
    harness.open();
    await harness.join(["guild-1"], policy());
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [{ guild: { id: "guild-1", ownerId: "owner" }, roles: [] }],
          "user",
        ),
        changes: [
          {
            organizationId: "guild-1",
            areas: ["presence"],
            restricted: true,
            expanded: false,
          },
        ],
      },
    });
    const source = getPlayersPresenceSource(getSocket(), "guild-1", "alpha");
    const release = source.subscribe(() => {});
    await source.refresh();
    expect(source.getSnapshot().accessState).toBe("forbidden");

    act(() => getSocket().setPresenceOrganizations(["guild-1"]));

    const publication = harness.wire.frames.findLast(
      (frame) => "type" in frame && frame.type === "presence.publish",
    );

    if (!publication || !("requestId" in publication) || !publication.requestId)
      throw new Error("Expected presence publication");
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
        accessPolicy: policy(),
        changes: [
          {
            organizationId: "guild-1",
            areas: ["presence"],
            restricted: false,
            expanded: true,
          },
        ],
      },
    });
    harness.wire.receive({
      v: 1,
      requestId: publication.requestId,
      status: "success",
      data: publishedPresence("presence-session"),
    });

    await waitFor(() => expect(harness.fetchPresence).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(source.getSnapshot().accessState).toBe("allowed"),
    );
    release();
  });

  it("shares one snapshot with rows and does no map notifications or animation work for a thousand same-map position updates", async () => {
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
});
