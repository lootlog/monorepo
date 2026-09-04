import { makeJsonCodec } from "#src/redis/redis.service";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import { makeMessagingDataLayer } from "#src/http-api/handlers/messaging/messaging.data-layer";
import { createReadyRoomForNotification } from "#src/http-api/handlers/party-ready-room/ready-room.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

export const messagingData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const readyRedis = {
      getJson: (key, schema) =>
        attempt(() => redis.getJson(key, makeJsonCodec(schema))),
      eval: <A>(
        script: string,
        keys: ReadonlyArray<string>,
        arguments_: ReadonlyArray<string | number>,
      ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
    };
    const publishReadyRoom = (envelope: unknown) =>
      rabbit
        .publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
          content: new TextEncoder().encode(JSON.stringify(envelope)),
        })
        .pipe(Effect.asVoid);
    return makeMessagingDataLayer(
      {
        get: (key) => attempt(() => redis.get(key)),
        set: (key, value, ttl) => attempt(() => redis.set(key, value, ttl)),
        eval: <A>(
          script: string,
          keys: ReadonlyArray<string>,
          arguments_: ReadonlyArray<string | number>,
        ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
      },
      {
        publish: (routingKey, payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid),
      },
      {
        create: (input) =>
          createReadyRoomForNotification(
            readyRedis,
            { publish: publishReadyRoom },
            input,
          ),
      },
    );
  }),
);
