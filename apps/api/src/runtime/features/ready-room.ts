import { makeJsonCodec } from "#src/redis/redis.service";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer } from "effect";
import {
  makeChatOperations,
  type ChatEvents,
  type ChatRedis,
} from "#src/http-api/handlers/chat/chat.data-layer";
import { makeReadyRoomDataLayer } from "#src/http-api/handlers/party-ready-room/ready-room.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

export const readyRoomData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const redisAdapter: ChatRedis = {
      rpush: (key, value) => attempt(() => redis.rpush(key, value)),
      ltrim: (key, start, stop) => attempt(() => redis.ltrim(key, start, stop)),
      lrange: (key, start, stop) =>
        attempt(() => redis.lrange(key, start, stop)),
      lset: (key, index, value) => attempt(() => redis.lset(key, index, value)),
      lrem: (key, count, value) => attempt(() => redis.lrem(key, count, value)),
      del: (key) => attempt(() => redis.del(key)),
    };
    const chatEvents: ChatEvents = {
      publish: (routingKey, payload) =>
        rabbit
          .publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          })
          .pipe(Effect.asVoid),
    };
    const chat = yield* makeChatOperations(redisAdapter, chatEvents);
    return makeReadyRoomDataLayer(
      {
        getJson: (key, schema) =>
          attempt(() => redis.getJson(key, makeJsonCodec(schema))),
        eval: <A>(
          script: string,
          keys: ReadonlyArray<string>,
          arguments_: ReadonlyArray<string | number>,
        ) => attempt(() => redis.eval<A>(script, [...keys], [...arguments_])),
      },
      {
        publish: (envelope) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey: RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
              content: new TextEncoder().encode(JSON.stringify(envelope)),
            })
            .pipe(Effect.asVoid),
        endPartyGatheringMessages: chat.endPartyGatheringMessages,
      },
    );
  }),
);
