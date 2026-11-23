import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { TestClock } from "effect/testing";
import { PresenceStore } from "./presence-store.js";
import {
  MemoryRedis,
  RecordingHub,
  READ,
  LOCATION,
  session,
  secondGuild,
  socket,
  makeStore,
  publish,
  readSnapshot,
  flush,
} from "../../test/presence-store-fixtures.js";

type CoverageEvent = {
  readonly guildId: string;
  readonly mapName: string;
  readonly discordId: string;
  readonly hasPlayer: boolean;
  readonly isAfk?: boolean;
};

class RecordingCoverage {
  readonly events: CoverageEvent[] = [];

  publish(event: CoverageEvent): Effect.Effect<void> {
    return Effect.sync(() => {
      this.events.push(event);
    });
  }
}

const sweepExpired = (store: PresenceStore) =>
  Effect.runPromise(store.sweepExpired);

describe("PresenceStore", () => {
  test("expires stale state and publishes a monotonic remove delta", async () => {
    let now = 1_000;
    const { hub, store } = makeStore({ now: () => now });
    await publish(store, socket(session([READ])));
    await flush(store);
    now = 61_001;
    await sweepExpired(store);
    await flush(store);
    const snapshot = await readSnapshot(store);
    expect(snapshot.presences).toEqual([]);
    expect(snapshot.revision).toBe(2);
    expect(hub.presenceEvents).toHaveLength(2);
    expect(hub.presenceEvents[1]?.basic).toMatchObject({
      data: {
        revision: 2,
        changes: [
          { action: "remove", userId: "user-1", discordId: "discord-1" },
        ],
      },
    });
  });

  test("clears published presence and coverage when all organization access is revoked", async () => {
    const coverage = new RecordingCoverage();
    const { store } = makeStore({ coverage });
    const publisher = socket(session([READ]));
    await publish(store, publisher, {
      location: { map: "Kwieciste Przejście" },
    });

    publisher.data.guilds = [];
    await expect(publish(store, publisher)).resolves.toBeUndefined();
    expect(publisher.data.presence).toBeUndefined();
    expect(await readSnapshot(store)).toMatchObject({ presences: [] });
    expect(coverage.events).toContainEqual({
      guildId: "organization-1",
      mapName: "Kwieciste Przejście",
      discordId: "discord-1",
      hasPlayer: false,
      isAfk: false,
    });
  });

  test.each<{ organizationIds: string[]; published: string[] }>([
    { organizationIds: [], published: [] },
    { organizationIds: ["organization-2"], published: ["organization-2"] },
    {
      organizationIds: ["organization-2", "unauthorized-organization"],
      published: ["organization-2"],
    },
  ])(
    "publishes only to the selected Lootlogs the session belongs to: %j",
    async ({ organizationIds, published }) => {
      const coverage = new RecordingCoverage();
      const { store } = makeStore({ coverage });
      const publisher = socket(session([READ]));
      publisher.data.guilds.push(secondGuild([READ]));
      await publish(store, publisher, {
        organizationIds,
        location: { map: "Kwieciste Przejście" },
      });

      expect(publisher.data.presence?.organizationIds ?? []).toEqual(published);

      for (const organizationId of [
        "organization-1",
        "organization-2",
        "unauthorized-organization",
      ]) {
        const snapshot = await readSnapshot(
          store,
          session([READ]),
          organizationId,
        );

        expect(snapshot.presences).toHaveLength(
          published.includes(organizationId) ? 1 : 0,
        );
      }

      expect(coverage.events.map(({ guildId }) => guildId)).toEqual(published);
    },
  );

  test("scopes snapshots and deltas to the receiving organization and stamps server lastSeen", async () => {
    const { hub, store } = makeStore();
    const publisher = socket(session([READ]));
    publisher.data.guilds.push(secondGuild([READ]));
    await publish(store, publisher, {
      clientObservedAt: 1,
      location: { map: "Target" },
    });
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));
    await flush(store);
    expect(publisher.data.presence?.organizationIds).toEqual([
      "organization-1",
      "organization-2",
    ]);

    for (const [index, organizationId] of [
      "organization-1",
      "organization-2",
    ].entries()) {
      for (const audience of ["basic", "precise"]) {
        const change = `${audience}.data.changes.0.presence`;

        expect(hub.presenceEvents[index]).toHaveProperty(
          `${change}.organizationIds`,
          [organizationId],
        );
        expect(hub.presenceEvents[index]).toHaveProperty(
          `${change}.lastSeen`,
          10_000,
        );
      }

      for (const permissions of [[READ], [READ, LOCATION]]) {
        const viewer = session(permissions);

        if (organizationId === "organization-2")
          viewer.guilds = [secondGuild(permissions)];

        const snapshot = await readSnapshot(store, viewer, organizationId);

        expect(snapshot.presences[0]?.organizationIds).toEqual([
          organizationId,
        ]);
      }
    }
  });

  test.each(["Target", "Other"])(
    "publishes coverage for a newly added organization on map %s",
    async (map) => {
      const coverage = new RecordingCoverage();
      const { store } = makeStore({ coverage });
      const publisher = socket(session([READ]));
      await publish(store, publisher, { location: { map: "Target" } });
      coverage.events.length = 0;
      publisher.data.guilds.push(secondGuild([READ]));
      await Effect.runPromise(store.reconcileAccess(publisher));
      await publish(store, publisher, { location: { map } });
      expect(
        coverage.events.filter((event) => event.guildId === "organization-2"),
      ).toEqual([
        {
          guildId: "organization-2",
          mapName: map,
          discordId: "discord-1",
          hasPlayer: true,
          isAfk: false,
        },
      ]);
      coverage.events.length = 0;
      await publish(store, publisher, { location: { map } });
      expect(coverage.events).toEqual([]);
    },
  );

  test("heartbeat removes revoked organizations and never recreates their presence", async () => {
    const coverage = new RecordingCoverage();
    const { store } = makeStore({ coverage });
    const publisher = socket(session([READ]));
    publisher.data.guilds.push(secondGuild([READ]));
    await publish(store, publisher, {
      location: { map: "Kwieciste Przejście" },
    });
    publisher.data.guilds = session([READ]).guilds;
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));

    expect(publisher.data.presence?.organizationIds).toEqual([
      "organization-1",
    ]);

    const revokedSnapshot = await readSnapshot(
      store,
      { ...session([READ]), guilds: [secondGuild([READ])] },
      "organization-2",
    );

    expect(revokedSnapshot.presences).toEqual([]);
    expect(coverage.events).toContainEqual({
      guildId: "organization-2",
      mapName: "Kwieciste Przejście",
      discordId: "discord-1",
      hasPlayer: false,
      isAfk: false,
    });
  });

  test("disconnect removes every organization's presence when a coverage event fails", async () => {
    const { store } = makeStore({
      coverage: {
        publish: (event) =>
          event.hasPlayer
            ? Effect.void
            : Effect.fail(new Error("Coverage unavailable")),
      },
    });

    const publisher = socket(session([READ]));
    publisher.data.guilds.push(secondGuild([READ]));
    await publish(store, publisher, {
      location: { map: "Kwieciste Przejście" },
    });

    const exit = await Effect.runPromiseExit(store.disconnect(publisher.data));

    expect(Exit.isFailure(exit)).toBe(true);
    expect((await readSnapshot(store)).presences).toEqual([]);

    const otherViewer = { ...session([READ]), guilds: [secondGuild([READ])] };
    const other = await readSnapshot(store, otherViewer, "organization-2");

    expect(other.presences).toEqual([]);
  });

  test("heartbeat refreshes stored presence without broadcasting an unchanged profile", async () => {
    let now = 10_000;
    const { hub, store } = makeStore({ now: () => now });
    const publisher = socket(session([READ]));
    await publish(store, publisher);
    await flush(store);
    hub.presenceEvents.length = 0;

    now = 20_000;
    await Effect.runPromise(store.heartbeat(publisher, "session-1"));
    await flush(store);

    expect(hub.presenceEvents).toEqual([]);
    await expect(readSnapshot(store)).resolves.toMatchObject({
      presences: [{ lastSeen: 20_000 }],
    });
  });
});

test("expiry cleanup resumes after a transient Redis failure", async () => {
  let attempts = 0;

  class RecoveringRedis extends MemoryRedis {
    override async set(
      key: string,
      value: string,
      ...options: Array<string | number>
    ) {
      if (key === "presence:expiry:sweep-lock") {
        attempts++;

        if (attempts === 1) throw new Error("Redis temporarily unavailable");
      }

      return super.set(key, value, ...options);
    }
  }

  const store = new PresenceStore(
    { command: new RecoveringRedis() },
    new RecordingHub(),
    Date.now,
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* store.runExpirySweep.pipe(Effect.forkScoped);
      yield* TestClock.adjust("5 seconds");
      expect(attempts).toBe(2);
    }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
  );
});
