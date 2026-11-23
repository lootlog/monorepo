import { describe, expect, test } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { MapPingService } from "#src/realtime/map-ping-service";
import { BattlePingService } from "#src/realtime/battle-ping-service";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  makeConfiguration,
  makeSocket,
  feedSocket,
  lootFeed,
  startFederatedInstance,
  eventsOfType,
  waitFor,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: realtime federation", () => {
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
                      Capability.LOOTLOG_TIMERS_READ,
                      Capability.LOOTLOG_TIMERS_TITANS_READ,
                    ]
                  : [Capability.LOOTLOG_TIMERS_READ],
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
});
