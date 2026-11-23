import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  guilds,
  locationReadGuilds,
  makeSession,
  gameSocket,
  openStore,
  presenceStore,
  depart,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: presence snapshots", () => {
  useDragonfly();

  test("presence snapshots follow a session's moves and removal with increasing revisions", async () => {
    await using redis = await openStore();
    const presence = presenceStore({ redis: redis.store });

    const source = gameSocket("snapshot-source", {
      memberships: guilds.slice(0, 1),
    });

    const viewer = {
      ...makeSession("snapshot-viewer"),
      guilds: locationReadGuilds,
    };

    const location = { mapId: 7, map: "Ithan", x: 1, y: 2 };

    const snapshot = () =>
      Effect.runPromise(presence.snapshot(viewer, "organization-1"));

    await Effect.runPromise(
      presence.publish(source, {
        organizationIds: ["organization-1"],
        location,
      }),
    );

    const published = await snapshot();

    expect(published.presences).toEqual([
      expect.objectContaining({
        sessionId: source.data.connectionId,
        organizationIds: ["organization-1"],
        location,
      }),
    ]);

    const moved = { ...location, x: 3 };

    await Effect.runPromise(
      presence.publish(source, {
        organizationIds: ["organization-1"],
        location: moved,
      }),
    );
    await Effect.runPromise(presence.flushDeltas);

    const updated = await snapshot();

    expect(updated.presences).toEqual([
      expect.objectContaining({ location: moved }),
    ]);
    expect(updated.revision).toBeGreaterThan(published.revision);
    await depart(presence, source);
    await Effect.runPromise(presence.flushDeltas);

    const disconnected = await snapshot();

    expect(disconnected.presences).toEqual([]);
    expect(disconnected.revision).toBeGreaterThan(updated.revision);
    expect(
      await redis.store.command.smembers("presence:index:organization-1"),
    ).toEqual([]);
    expect(
      await redis.store.command.get("presence:organization-1:snapshot-source"),
    ).toBeNull();
  });
});
