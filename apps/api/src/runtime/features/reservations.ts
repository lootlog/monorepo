import { makeJsonCodec } from "#src/redis/redis.service";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { HttpClient } from "effect/http";
import { makeReservationCatalogAdapter } from "#src/reservations/reservation-catalog.adapter";
import { makeReservationReadDataLayer } from "#src/reservations/reservation-read.data-layer";
import { makeReservationSharingDataLayer } from "#src/reservations/reservation-sharing.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { NotificationDispatchQueue } from "#src/runtime/queues/notification-dispatch";
import { makeReservationMutationsDataLayer } from "#src/reservations/reservation-mutations.data-layer";

export const reservationSharingData = Layer.unwrap(
  Effect.map(RabbitMessaging, (rabbit) =>
    makeReservationSharingDataLayer({
      sharingChanged: (sourceGuildId, audienceGuildIds) =>
        rabbit.publish(
          eventMessage(RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2, {
            version: 2,
            action: "sharing-changed",
            sourceGuildId,
            audienceGuildIds,
            reservationId: null,
            spotId: null,
          }),
        ),
    }),
  ),
);

/** Reservation reads and mutations over one cached spot catalog. */
export const reservationData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const notifications = yield* NotificationDispatchQueue;

    const catalog = makeReservationCatalogAdapter({
      cache: {
        getJson: (key, schema) => redis.getJson(key, makeJsonCodec(schema)),
        setJson: (key, value, ttl) => redis.setJson(key, value, ttl),
      },
      httpClient,
      url: config.reservationsCardsUrl.toString(),
    });

    return Layer.merge(
      makeReservationReadDataLayer(catalog),
      makeReservationMutationsDataLayer({
        catalog,
        enqueueNotification: notifications.add,
        removeNotification: notifications.remove,
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)),
      }),
    );
  }),
);
