import { describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { tryDecodeRealtimeFrameValue } from "@lootlog/protocol/realtime/codec";
import { Effect, Fiber, Result } from "effect";
import { decodeFederatedRealtimeMessage } from "#src/platform/redis-store";
import { dragonflyUrl, useDragonfly } from "./dragonfly-fixtures.js";
import {
  makeSocket,
  startAirTagInstances,
  observation,
  moveAirTagSocket,
  eventsOfType,
  waitFor,
} from "./realtime-redis-fixtures.js";

const federatedAirTagRevision = (
  raw: string,
  mapId: number,
): number | undefined => {
  const { event } = decodeFederatedRealtimeMessage(raw);

  if (event === undefined) return undefined;
  const decoded = Result.getOrThrow(tryDecodeRealtimeFrameValue(event));

  return "type" in decoded &&
    decoded.type === "air-tag.scope-updated" &&
    decoded.data.mapId === mapId
    ? decoded.data.revision
    : undefined;
};

describe("realtime Dragonfly integration: air tag federation", () => {
  useDragonfly();

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

  test("air-tag updates cross Redis only for maps another replica follows", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const channelUpdates: number[] = [];
    const channelListener = new RedisClient(dragonflyUrl());

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
