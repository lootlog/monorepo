import { describe, expect, test } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { NpcPresenceService } from "#src/realtime/npc-presence-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { membership } from "./realtime-fixtures.js";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  makeConfiguration,
  makeSocket,
  openStore,
  eventsOfType,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: npc presence", () => {
  useDragonfly();

  test("NPC presence reaches timer readers only when an NPC gains its first or loses its last reporter", async () => {
    const configuration = makeConfiguration();
    await using redis = await openStore(configuration.redis.keyPrefix);
    const hub = new RealtimeHub(configuration, redis.store);
    const service = new NpcPresenceService(redis.store, hub);

    const timerSocket = (connectionId: string, lvlRangeTo = 500) => {
      const created = makeSocket(connectionId);
      created.socket.data.guilds = [
        membership(
          "organization-1",
          [Capability.LOOTLOG_TIMERS_READ, Capability.LOOTLOG_TIMERS_WRITE],
          { roleId: "timers", lvlRangeTo },
        ),
      ];
      created.socket.data.character = created.socket.data.presence?.character;
      hub.register(created.socket);
      hub.subscribe(created.socket, {
        topic: "organization.timers",
        organizationId: "organization-1",
      });

      return created;
    };

    const first = timerSocket("first-reporter");
    const second = timerSocket("second-reporter");
    const lowLevelReader = timerSocket("low-level-reader", 50);

    const presenceUpdates = (frames: readonly string[]) =>
      eventsOfType(frames, "npc-presence.updated").map(({ data }) => data);

    const elite = { id: 101, lvl: 120, wt: 25, prof: "w", type: 2 };

    const report = (npcs: (typeof elite)[], world = "classic") => ({
      world,
      organizationIds: ["organization-1"],
      npcs,
      map: "Mroczny Przesmyk",
    });

    await expect(
      Effect.runPromise(service.report(first.socket, report([elite]))),
    ).resolves.toEqual({ status: "accepted" });
    await expect(
      Effect.runPromise(service.report(second.socket, report([elite]))),
    ).resolves.toEqual({ status: "accepted" });

    expect(presenceUpdates(first.frames)).toEqual([
      expect.objectContaining({
        organizationId: "organization-1",
        world: "classic",
        npc: elite,
        standing: true,
        map: "Mroczny Przesmyk",
      }),
    ]);
    expect(presenceUpdates(lowLevelReader.frames)).toEqual([]);

    await expect(
      Effect.runPromise(
        service.fetch(second.socket, "organization-1", "classic"),
      ),
    ).resolves.toMatchObject({
      npcs: [{ npc: elite, map: "Mroczny Przesmyk" }],
    });
    await expect(
      Effect.runPromise(
        service.fetch(lowLevelReader.socket, "organization-1", "classic"),
      ),
    ).resolves.toMatchObject({ npcs: [] });

    await Effect.runPromise(service.withdraw(first.socket));
    expect(presenceUpdates(second.frames)).toHaveLength(1);

    second.socket.data.character = {
      ...second.socket.data.character!,
      world: "tempest",
    };
    await Effect.runPromise(
      service.report(second.socket, report([], "tempest")),
    );

    const updates = presenceUpdates(second.frames);
    expect(updates).toEqual([
      expect.objectContaining({ standing: true }),
      expect.objectContaining({
        npc: elite,
        standing: false,
        world: "classic",
      }),
    ]);
    expect(updates[1]!.revision).toBeGreaterThan(updates[0]!.revision);
    await expect(
      Effect.runPromise(
        service.fetch(second.socket, "organization-1", "classic"),
      ),
    ).resolves.toMatchObject({ npcs: [] });

    await Effect.runPromise(
      service.report(second.socket, report([elite], "tempest")),
    );
    second.socket.data.npcPresence = undefined;
    await Effect.runPromise(
      service.report(second.socket, report([], "tempest")),
    );
    expect(presenceUpdates(second.frames).slice(-2)).toEqual([
      expect.objectContaining({ world: "tempest", standing: true }),
      expect.objectContaining({ world: "tempest", standing: false }),
    ]);
  }, 30_000);
});
