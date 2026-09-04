import { makeJsonCodec } from "#src/redis/redis.service";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import { makeReservationCatalogAdapter } from "#src/http-api/handlers/organization-workspace/reservation-catalog.adapter";
import { makeReservationReadDataLayer } from "#src/http-api/handlers/organization-workspace/reservation-read.data-layer";
import { makeReservationSharingDataLayer } from "#src/http-api/handlers/organization-workspace/reservation-sharing.data-layer";
import { ApiRedis, redisUrl } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/jobs/dispatch-queue";
import { Queue } from "bullmq";
import { makeReservationMutationsDataLayer } from "#src/http-api/handlers/organization-workspace/reservation-mutations.data-layer";

export const reservationSharingData = Layer.unwrap(
  Effect.map(RabbitMessaging, (rabbit) =>
    makeReservationSharingDataLayer({
      sharingChanged: (sourceGuildId, audienceGuildIds) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
          content: new TextEncoder().encode(
            JSON.stringify({
              version: 2,
              action: "sharing-changed",
              sourceGuildId,
              audienceGuildIds,
              reservationId: null,
              spotId: null,
            }),
          ),
        }),
    }),
  ),
);
export const reservationReadData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    return makeReservationReadDataLayer(
      makeReservationCatalogAdapter({
        cache: {
          getJson: (key, schema) =>
            attempt(() => redis.getJson(key, makeJsonCodec(schema))),
          setJson: (key, value, ttl) =>
            attempt(() => redis.setJson(key, value, ttl)),
        },
        httpClient,
        url: config.reservationsCardsUrl.toString(),
      }),
    );
  }),
);
export const reservationMutationsData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const notificationsQueue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(NOTIFICATIONS_DISPATCH_QUEUE, {
            connection: { url: redisUrl(config.redis) },
            prefix: "{bull}",
          }),
      ),
      (queue) => Effect.tryPromise(() => queue.close()),
    );
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const catalog = makeReservationCatalogAdapter({
      cache: {
        getJson: (key, schema) =>
          attempt(() => redis.getJson(key, makeJsonCodec(schema))),
        setJson: (key, value, ttl) =>
          attempt(() => redis.setJson(key, value, ttl)),
      },
      httpClient,
      url: config.reservationsCardsUrl.toString(),
    });
    return makeReservationMutationsDataLayer({
      catalog,
      enqueueNotification: (notificationJobId, delay) =>
        attempt(() =>
          notificationsQueue.add(
            notificationJobId,
            { notificationJobId },
            {
              jobId: notificationJobId,
              delay,
              removeOnComplete: true,
              removeOnFail: true,
            },
          ),
        ),
      removeNotification: (notificationJobId) =>
        attempt(async () => {
          const job = await notificationsQueue.getJob(notificationJobId);
          await job?.remove();
        }),
      publish: (routingKey, payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
  }),
);
