import { AIR_TAG_REPORTER_LEASE_MS } from "@lootlog/schema/air-tag";
import { describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { Effect, Fiber } from "effect";
import type { AirTagService } from "#src/realtime/air-tag-service";
import {
  clanEnemy,
  eventsOfType,
  federatedAirTagRevision,
  makeSocket,
  moveAirTagSocket,
  observation,
  useDragonfly,
  waitFor,
} from "./realtime-redis.integration.fixtures.js";

describe("realtime Dragonfly integration: air-tag routing", () => {
  const { redisUrl, startAirTagInstances } = useDragonfly();

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

  test("air-tag updates cross Redis only for maps another replica follows", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const channelUpdates: number[] = [];
    const channelListener = new RedisClient(redisUrl());

    try {
      await channelListener.subscribe(first.store.channel, (raw) => {
        const revision = federatedAirTagRevision(raw, 11);

        if (revision !== undefined) channelUpdates.push(revision);
      });

      const soloObserver = makeSocket("solo-observer");
      const localWatcher = makeSocket("local-watcher");
      const remoteWatcher = makeSocket("remote-watcher");

      for (const target of [soloObserver, localWatcher, remoteWatcher])
        moveAirTagSocket(target.socket, { mapId: 11, map: "Solo" });

      first.hub.register(soloObserver.socket);
      first.hub.register(localWatcher.socket);
      second.hub.register(remoteWatcher.socket);

      for (const target of [soloObserver, localWatcher])
        await Effect.runPromise(
          sourceAirTags.updateSubscription(target.socket, {
            requestId: `${target.socket.data.connectionId}-subscription`,
            enabled: true,
            expectedMapId: 11,
          }),
        );

      const soloUpdates = (target: ReturnType<typeof makeSocket>) =>
        eventsOfType(target.frames, "air-tag.scope-updated").length;

      const reportSolo = (x: number) =>
        expect(
          Effect.runPromise(
            sourceAirTags.publishObservations(soloObserver.socket, {
              expectedMapId: 11,
              observations: [{ ...observation, targetId: "solo", x }],
            }),
          ),
        ).resolves.toMatchObject({ status: "accepted" });

      await reportSolo(1);
      await waitFor(() => soloUpdates(localWatcher) === 1);
      await Bun.sleep(100);
      expect(channelUpdates).toHaveLength(0);

      await Effect.runPromise(
        recipientAirTags.updateSubscription(remoteWatcher.socket, {
          requestId: "remote-watcher-subscription",
          enabled: true,
          expectedMapId: 11,
        }),
      );
      await reportSolo(2);
      await waitFor(() => soloUpdates(remoteWatcher) === 1);
      expect(soloUpdates(localWatcher)).toBe(2);
      expect(channelUpdates).toHaveLength(1);

      await first.store.command.del(
        "{air-tag:organization-1}:classic:11:replicas",
      );
      await reportSolo(3);
      await Bun.sleep(100);
      expect(channelUpdates).toHaveLength(1);

      const refresh = second.runtime.runFork(
        recipientAirTags.runInterestRefresh,
      );

      await Bun.sleep(100);
      await second.runtime.runPromise(Fiber.interrupt(refresh));
      await reportSolo(4);
      await waitFor(() => soloUpdates(remoteWatcher) === 2);
      expect(channelUpdates).toHaveLength(2);

      const anyMapWatcher = makeSocket("any-map-watcher");

      const anyMap = {
        topic: "map.air-tags",
        organizationId: "organization-1",
      } as const;

      moveAirTagSocket(anyMapWatcher.socket, { mapId: 12, map: "Elsewhere" });
      moveAirTagSocket(soloObserver.socket, { mapId: 12, map: "Elsewhere" });
      second.hub.register(anyMapWatcher.socket);
      second.hub.subscribe(anyMapWatcher.socket, anyMap);
      await Effect.runPromise(recipientAirTags.registerInterest(anyMap));
      await Effect.runPromise(
        sourceAirTags.updateSubscription(soloObserver.socket, {
          requestId: "solo-observer-elsewhere",
          enabled: true,
          expectedMapId: 12,
        }),
      );
      await expect(
        Effect.runPromise(
          sourceAirTags.publishObservations(soloObserver.socket, {
            expectedMapId: 12,
            observations: [{ ...observation, targetId: "elsewhere" }],
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });
      await waitFor(() => soloUpdates(anyMapWatcher) === 1);
    } finally {
      channelListener.close();
    }
  });
});
