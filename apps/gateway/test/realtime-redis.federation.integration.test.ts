import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { MapPingService } from "#src/realtime/map-ping-service";
import { BattlePingService } from "#src/realtime/battle-ping-service";
import { NpcPresenceService } from "#src/realtime/npc-presence-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { membership } from "./realtime-fixtures.js";
import {
  eventsOfType,
  feedSocket,
  lootFeed,
  makeSocket,
  useDragonfly,
  waitFor,
} from "./realtime-redis.integration.fixtures.js";

describe("realtime Dragonfly integration: federation and pings", () => {
  const { makeConfiguration, openStore, startFederatedInstance } =
    useDragonfly();

  test("federated loot and timer frames keep their routing through Dragonfly", async () => {
    const configuration = makeConfiguration();
    await using first = await startFederatedInstance(configuration);
    await using second = await startFederatedInstance(configuration);
    const visibleFeed = feedSocket("visible-feed");
    const hiddenFeed = feedSocket("hidden-feed", 99);

    for (const target of [visibleFeed, hiddenFeed]) {
      second.hub.register(target.socket);
      second.hub.subscribe(target.socket, lootFeed);
    }

    await first.hub.publishToScope(
      lootFeed,
      { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
      "persisted-kill-1",
      {
        recipientPlatform: "web-app",
        sourceNpcs: [{ level: 100, type: "HERO" }],
      },
    );
    await waitFor(() => visibleFeed.frames.length === 1);
    expect(hiddenFeed.frames).toHaveLength(0);
    expect(eventsOfType(visibleFeed.frames, "kills.changed")).toEqual([
      { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
    ]);

    const timers = {
      topic: "organization.timers",
      organizationId: "organization-1",
    } as const;

    const timerTargets = [first.hub, second.hub].flatMap((hub, index) =>
      [false, true].map((allowed) => {
        const target = makeSocket(`timer-${index}-${allowed}`);
        target.socket.data.guilds = [
          {
            guild: { id: "organization-1", ownerId: "owner" },
            roles: [
              {
                id: "timer-role",
                lvlRangeFrom: 200,
                lvlRangeTo: 500,
                permissions: allowed
                  ? [
                      Permission.LOOTLOG_TIMERS_READ,
                      Permission.LOOTLOG_TIMERS_TITANS_READ,
                    ]
                  : [Permission.LOOTLOG_TIMERS_READ],
              },
              {
                id: "empty",
                lvlRangeFrom: 0,
                lvlRangeTo: 500,
                permissions: [],
              },
            ],
          },
        ];
        hub.register(target.socket);
        hub.subscribe(target.socket, timers);

        return { ...target, allowed };
      }),
    );

    const titanCreated = (lvl: number) =>
      first.hub.publishToScope(timers, {
        v: 1,
        type: "timer.created",
        data: {
          organizationId: "organization-1",
          payload: { guildId: "organization-1", npc: { type: "TITAN", lvl } },
        },
      });

    const delivered = (count: number) =>
      waitFor(() =>
        timerTargets
          .filter((target) => target.allowed)
          .every((target) => target.frames.length === count),
      );

    await titanCreated(250);
    await first.hub.publishToScope(timers, {
      v: 1,
      type: "timer.deleted",
      data: {
        organizationId: "organization-1",
        payload: {
          guildId: "organization-1",
          routing: { tier: "titans", npcLevel: 250 },
        },
      },
    });
    await delivered(2);

    for (const target of timerTargets.filter((target) => !target.allowed))
      expect(target.frames).toHaveLength(0);
    await titanCreated(105);
    await titanCreated(500);
    await delivered(3);

    for (const target of timerTargets.filter((target) => !target.allowed))
      expect(target.frames).toHaveLength(0);
  });

  test("federated map pings share one budget and leave battle pings their own", async () => {
    const configuration = makeConfiguration();
    await using first = await startFederatedInstance(configuration);
    await using second = await startFederatedInstance(configuration);
    const source = makeSocket("source");
    const recipient = makeSocket("recipient");
    first.hub.register(source.socket);
    second.hub.register(recipient.socket);

    for (const organizationId of ["organization-1", "organization-2"]) {
      second.hub.subscribe(recipient.socket, {
        topic: "map.pings",
        organizationId,
        world: "classic",
        mapId: 7,
      });
    }

    const localWildcard = makeSocket("local-wildcard");
    const remoteWildcard = makeSocket("remote-wildcard");
    first.hub.register(localWildcard.socket);
    second.hub.register(remoteWildcard.socket);

    for (const { hub, target } of [
      { hub: first.hub, target: source },
      { hub: first.hub, target: localWildcard },
      { hub: second.hub, target: remoteWildcard },
    ]) {
      for (const organizationId of ["organization-1", "organization-2"])
        hub.subscribe(target.socket, { topic: "map.pings", organizationId });
    }

    const mapPings = new MapPingService(first.store, first.hub);

    for (let index = 0; index < 5; index += 1) {
      await expect(
        Effect.runPromise(
          mapPings.send(source.socket, {
            expectedMapId: 7,
            type: "enemy",
            x: index,
            y: index,
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });

      if (index === 2) {
        await waitFor(
          () =>
            eventsOfType(remoteWildcard.frames, "map-ping.received").length ===
            3,
        );
        const presence = remoteWildcard.socket.data.presence;

        if (!presence) throw new Error("Missing remote presence");
        second.hub.setPresence(remoteWildcard.socket, {
          ...presence,
          location: { mapId: 8, map: "Another map" },
        });
      }
    }

    await expect(
      Effect.runPromise(
        mapPings.send(source.socket, {
          expectedMapId: 7,
          type: "enemy",
          x: 6,
          y: 6,
        }),
      ),
    ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });
    await waitFor(
      () => eventsOfType(recipient.frames, "map-ping.received").length >= 5,
    );
    expect(eventsOfType(source.frames, "map-ping.received")).toHaveLength(0);
    expect(eventsOfType(recipient.frames, "map-ping.received")).toHaveLength(5);
    expect(
      eventsOfType(localWildcard.frames, "map-ping.received"),
    ).toHaveLength(5);
    expect(
      eventsOfType(remoteWildcard.frames, "map-ping.received"),
    ).toHaveLength(3);

    const battleRecipient = makeSocket("battle-recipient");
    const battleBystander = makeSocket("battle-bystander");

    for (const [target, characterId] of [
      [battleRecipient, "100"],
      [battleBystander, "200"],
    ] as const) {
      const presence = target.socket.data.presence;

      if (!presence?.character) throw new Error("Missing battle ping presence");
      target.socket.data = {
        ...target.socket.data,
        presence: {
          ...presence,
          character: { ...presence.character, characterId },
        },
      };
      second.hub.register(target.socket);
      second.hub.subscribe(target.socket, {
        topic: "map.pings",
        organizationId: "organization-1",
        world: "classic",
        mapId: 7,
      });
    }

    await expect(
      Effect.runPromise(
        new BattlePingService(first.store, first.hub).send(source.socket, {
          expectedMapId: 7,
          type: "attack",
          warriorId: -1,
          recipientCharacterIds: ["100"],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    await waitFor(
      () =>
        eventsOfType(battleRecipient.frames, "battle-ping.received").length ===
        1,
    );
    expect(
      eventsOfType(battleBystander.frames, "battle-ping.received"),
    ).toHaveLength(0);
    expect(eventsOfType(recipient.frames, "battle-ping.received")).toHaveLength(
      0,
    );
  });

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
          [Permission.LOOTLOG_TIMERS_READ, Permission.LOOTLOG_TIMERS_WRITE],
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
