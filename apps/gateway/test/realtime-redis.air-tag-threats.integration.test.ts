import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { AirTagService } from "#src/realtime/air-tag-service";
import {
  clanEnemy,
  clanEnemyFields,
  eventsOfType,
  makeSocket,
  moveAirTagSocket,
  observation,
  setSocketPresence,
  threatWatcher,
  useDragonfly,
  waitFor,
} from "./realtime-redis.integration.fixtures.js";

describe("realtime Dragonfly integration: air-tag threats", () => {
  const { startAirTagInstances } = useDragonfly();

  test("air-tag observations federate per enabled Lootlog, limit each connection and expire idle targets", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const source = makeSocket("source");
    const recipient = makeSocket("recipient");
    first.hub.register(source.socket);
    second.hub.register(recipient.socket);
    await Effect.runPromise(
      sourceAirTags.updateSubscription(source.socket, {
        requestId: "source-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );
    await Effect.runPromise(
      recipientAirTags.updateSubscription(recipient.socket, {
        requestId: "recipient-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [
            observation,
            { ...observation, x: 12 },
            { ...observation, targetId: "neutral", relation: 1 },
            { ...observation, targetId: "personal", relation: 3 },
          ],
        }),
      ),
    ).resolves.toEqual({
      status: "accepted",
      acceptedScopes: 1,
      acceptedTargets: 1,
    });
    await waitFor(
      () =>
        eventsOfType(recipient.frames, "air-tag.scope-updated").length === 1,
    );
    expect(eventsOfType(source.frames, "air-tag.scope-updated")).toHaveLength(
      0,
    );

    const reconnected = makeSocket("reconnected");
    second.hub.register(reconnected.socket);

    const rejoined = await Effect.runPromise(
      recipientAirTags.updateSubscription(reconnected.socket, {
        requestId: "reconnected-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    expect(rejoined).toMatchObject({
      status: "accepted",
      scopes: [{ targets: [{ targetId: "target-1", x: 12 }] }],
    });
    expect(
      rejoined.status === "accepted" && rejoined.scopes[0]?.targets,
    ).toHaveLength(1);

    for (let index = 0; index < 14; index += 1) {
      const acknowledgement = await Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation],
        }),
      );

      expect(acknowledgement).toMatchObject({ status: "accepted" });
    }

    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation],
        }),
      ),
    ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });

    await Bun.sleep(10_100);
    const afterExpiry = makeSocket("after-expiry");

    const expiredSnapshot = await Effect.runPromise(
      recipientAirTags.updateSubscription(afterExpiry.socket, {
        requestId: "expired-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    expect(expiredSnapshot).toMatchObject({
      status: "accepted",
      scopes: [{ targets: [] }],
    });
  }, 30_000);

  test("air-tag threats reach location readers once per change and keep the last reported details", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const source = makeSocket("source");
    first.hub.register(source.socket);
    await Effect.runPromise(
      sourceAirTags.updateSubscription(source.socket, {
        requestId: "source-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    const watcher = threatWatcher("threat-watcher");
    const locationBlind = threatWatcher("location-blind", false);

    for (const target of [watcher, locationBlind]) {
      second.hub.register(target.socket);
      second.hub.subscribe(target.socket, {
        topic: "organization.presence",
        organizationId: "organization-1",
      });
    }

    const publishThreat = async (sighting: typeof clanEnemy) =>
      expect(
        Effect.runPromise(
          sourceAirTags.publishObservations(source.socket, {
            expectedMapId: 7,
            observations: [sighting, observation],
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });

    const threatEvents = () =>
      eventsOfType(watcher.frames, "air-tag.map-threat-updated");

    await publishThreat(clanEnemy);
    await publishThreat({ ...clanEnemy, x: 9 });
    await publishThreat({ ...clanEnemy, stasis: false });
    await waitFor(() => threatEvents().length === 2);

    const {
      lvl: _lvl,
      prof: _prof,
      stasis: _stasis,
      ...legacySighting
    } = clanEnemy;

    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [legacySighting],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    await Bun.sleep(1_200);
    expect(threatEvents()).toMatchObject([
      {
        data: {
          guildId: "organization-1",
          world: "classic",
          mapId: 7,
          mapName: "Ithan",
          revision: expect.any(Number),
          enemies: [
            {
              ...clanEnemyFields(clanEnemy),
              stasis: true,
              ageMs: expect.any(Number),
            },
          ],
        },
      },
      {
        data: {
          enemies: [{ ...clanEnemyFields(clanEnemy), stasis: false }],
        },
      },
    ]);

    source.socket.data.confidence = "reported";
    await publishThreat({ ...clanEnemy, targetId: "unverified" });
    source.socket.data.confidence = "verified";
    const { clan: _clan, ...clanless } = clanEnemy;
    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [{ ...clanless, targetId: "clanless" }],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });

    await expect(
      Effect.runPromise(
        recipientAirTags.fetchMapThreats(
          watcher.socket,
          "organization-1",
          "classic",
        ),
      ),
    ).resolves.toMatchObject({
      threats: [
        {
          mapId: 7,
          mapName: "Ithan",
          enemies: [
            { targetId: "clan-enemy", lvl: 250, prof: "m", stasis: false },
          ],
        },
      ],
    });
    expect(
      await airTags.first.store.command.eval<number>(
        'return redis.call("PTTL",KEYS[1])',
        1,
        "air-tag:threat-maps:organization-1:classic",
      ),
    ).toBeWithin(1, 30_001);
    await expect(
      Effect.runPromise(
        recipientAirTags.fetchMapThreats(
          locationBlind.socket,
          "organization-1",
          "classic",
        ),
      ),
    ).resolves.toBeNull();
    expect(
      eventsOfType(locationBlind.frames, "air-tag.map-threat-updated"),
    ).toHaveLength(0);
  });

  test("an air-tag target leaves once no observer still sees it and one saw it leave the map", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const watcher = threatWatcher("threat-watcher");
    second.hub.register(watcher.socket);
    second.hub.subscribe(watcher.socket, {
      topic: "organization.presence",
      organizationId: "organization-1",
    });

    const scopeRecipient = makeSocket("scope-recipient");
    const firstObserver = makeSocket("first-observer");
    const secondObserver = makeSocket("second-observer");
    const bystander = makeSocket("bystander");
    const observers = [firstObserver, secondObserver, bystander];

    for (const target of [...observers, scopeRecipient])
      moveAirTagSocket(target.socket, { mapId: 9, map: "Nithal" });

    observers.forEach((target) => first.hub.register(target.socket));
    second.hub.register(scopeRecipient.socket);
    await Promise.all(
      observers.map((target) =>
        Effect.runPromise(
          sourceAirTags.updateSubscription(target.socket, {
            requestId: `${target.socket.data.connectionId}-subscription`,
            enabled: true,
            expectedMapId: 9,
          }),
        ),
      ),
    );
    await Effect.runPromise(
      recipientAirTags.updateSubscription(scopeRecipient.socket, {
        requestId: "scope-recipient-subscription",
        enabled: true,
        expectedMapId: 9,
      }),
    );

    const scopeUpdates = () =>
      eventsOfType(scopeRecipient.frames, "air-tag.scope-updated").map(
        ({ data }) => data,
      );

    const mapThreats = () =>
      eventsOfType(watcher.frames, "air-tag.map-threat-updated").flatMap(
        ({ data }) =>
          data.mapId === 9
            ? [data.enemies.map(({ targetId }) => targetId)]
            : [],
      );

    const wanderer = { ...clanEnemy, targetId: "wanderer" };
    const lurker = { ...observation, targetId: "lurker" };

    const report = (
      target: ReturnType<typeof makeSocket>,
      batch: Omit<
        Parameters<AirTagService["publishObservations"]>[1],
        "expectedMapId"
      >,
    ) =>
      expect(
        Effect.runPromise(
          sourceAirTags.publishObservations(target.socket, {
            expectedMapId: 9,
            ...batch,
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });

    await report(firstObserver, { observations: [wanderer, lurker] });
    await report(secondObserver, { observations: [wanderer, lurker] });
    await waitFor(() => scopeUpdates().length === 1);
    await waitFor(() => mapThreats().length === 1);
    expect(scopeUpdates()).toMatchObject([
      {
        mapId: 9,
        targets: [{ targetId: "wanderer" }, { targetId: "lurker" }],
        removedTargetIds: [],
      },
    ]);

    await report(firstObserver, {
      observations: [],
      departures: [
        { targetId: "wanderer", reason: "left-map" },
        { targetId: "lurker", reason: "out-of-sight" },
      ],
    });
    await report(secondObserver, {
      observations: [],
      departures: [
        { targetId: "wanderer", reason: "out-of-sight" },
        { targetId: "lurker", reason: "out-of-sight" },
      ],
    });
    await report(bystander, {
      observations: [],
      departures: [{ targetId: "lurker", reason: "left-map" }],
    });
    await waitFor(() => scopeUpdates().length === 3);
    await waitFor(() => mapThreats().length === 2);
    await Bun.sleep(100);
    expect(scopeUpdates()[1]).toMatchObject({
      targets: [],
      removedTargetIds: [],
      unreportedTargetIds: ["wanderer", "lurker"],
    });
    expect(scopeUpdates()[2]).toMatchObject({
      targets: [],
      removedTargetIds: ["wanderer"],
    });

    const [sighted, , departed] = scopeUpdates().map(
      ({ revision }) => revision,
    );

    expect(departed).toBeGreaterThan(sighted ?? Number.POSITIVE_INFINITY);
    expect(mapThreats()).toEqual([["wanderer"], []]);

    const afterDeparture = makeSocket("after-departure");
    setSocketPresence(
      afterDeparture.socket,
      scopeRecipient.socket.data.presence,
    );
    await expect(
      Effect.runPromise(
        recipientAirTags.updateSubscription(afterDeparture.socket, {
          requestId: "after-departure-subscription",
          enabled: true,
          expectedMapId: 9,
        }),
      ),
    ).resolves.toMatchObject({
      status: "accepted",
      scopes: [{ targets: [{ targetId: "lurker" }] }],
    });
  });
});
