import { describe, expect, test } from "bun:test";
import { AIR_TAG_REPORTER_LEASE_MS } from "@lootlog/schema/air-tag";
import { Effect } from "effect";
import { AirTagService } from "#src/realtime/air-tag-service";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  locationReadGuilds,
  makeSocket,
  setSocketPresence,
  startAirTagInstances,
  observation,
  moveAirTagSocket,
  eventsOfType,
  waitFor,
} from "./realtime-redis-fixtures.js";

const clanEnemyFields = ({
  targetId,
  nickname,
  clan,
  lvl,
  prof,
}: {
  targetId: string;
  nickname: string;
  clan: { id: number; name: string };
  lvl: number;
  prof: string;
}) => ({ targetId, nickname, clan, lvl, prof });

const clanEnemy = {
  targetId: "clan-enemy",
  nickname: "Rival",
  clan: { id: 5, name: "Rivals" },
  relation: 6 as const,
  x: 3,
  y: 4,
  lvl: 250,
  prof: "m",
  stasis: true,
};

const threatWatcher = (connectionId: string, readsLocation = true) => {
  const target = makeSocket(connectionId);

  if (readsLocation) target.socket.data.guilds = locationReadGuilds;
  moveAirTagSocket(target.socket, { mapId: 8, map: "Karka-han" });

  return target;
};

describe("realtime Dragonfly integration: air tag tracking", () => {
  useDragonfly();

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

  test("one observer reports an air-tag target and hands it over when it leaves or falls silent", async () => {
    await using airTags = await startAirTagInstances();
    const { first, sourceAirTags } = airTags;
    const reporter = makeSocket("reporter");
    const standby = makeSocket("standby");

    for (const observer of [reporter, standby]) {
      moveAirTagSocket(observer.socket, { mapId: 11, map: "Tuzmer" });
      first.hub.register(observer.socket);
      await Effect.runPromise(
        sourceAirTags.updateSubscription(observer.socket, {
          requestId: `${observer.socket.data.connectionId}-subscription`,
          enabled: true,
          expectedMapId: 11,
        }),
      );
    }

    const report = (
      observer: ReturnType<typeof makeSocket>,
      batch: Omit<
        Parameters<AirTagService["publishObservations"]>[1],
        "expectedMapId"
      >,
    ) =>
      Effect.runPromise(
        sourceAirTags.publishObservations(observer.socket, {
          expectedMapId: 11,
          ...batch,
        }),
      );

    const sighting = { observations: [clanEnemy] };

    const reported = {
      status: "accepted",
      acceptedScopes: 1,
      acceptedTargets: 1,
    } as const;

    expect(await report(reporter, sighting)).toEqual(reported);
    expect(await report(standby, sighting)).toMatchObject({
      status: "accepted",
      standbyTargetIds: [clanEnemy.targetId],
    });
    expect(await report(reporter, sighting)).toEqual(reported);

    await report(reporter, {
      observations: [],
      departures: [{ targetId: clanEnemy.targetId, reason: "out-of-sight" }],
    });
    expect(await report(standby, sighting)).toEqual(reported);
    expect(await report(reporter, sighting)).toMatchObject({
      standbyTargetIds: [clanEnemy.targetId],
    });

    const [walker, remaining] = [standby, reporter];

    remaining.frames.length = 0;
    await Effect.runPromise(
      sourceAirTags.updateSubscription(walker.socket, {
        requestId: "walker-leaves",
        enabled: false,
      }),
    );
    await waitFor(() =>
      eventsOfType(remaining.frames, "air-tag.scope-updated").some(
        ({ data }) =>
          data.unreportedTargetIds?.includes(clanEnemy.targetId) === true,
      ),
    );
    expect(await report(remaining, sighting)).toEqual(reported);

    await Effect.runPromise(
      sourceAirTags.updateSubscription(walker.socket, {
        requestId: "walker-returns",
        enabled: true,
        expectedMapId: 11,
      }),
    );
    expect(await report(walker, sighting)).toMatchObject({
      standbyTargetIds: [clanEnemy.targetId],
    });

    await Bun.sleep(AIR_TAG_REPORTER_LEASE_MS + 100);
    expect(await report(walker, sighting)).toEqual(reported);
  }, 30_000);
});
