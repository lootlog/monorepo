import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import {
  makeChatDataLayer,
  type ChatEvents,
  type ChatRedis,
} from "#src/http-api/handlers/chat/chat.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

export const makeChatRedis = (redis: ApiRedis["Service"]): ChatRedis => {
  const attempt = <A>(operation: () => PromiseLike<A>) =>
    Effect.tryPromise({ try: operation, catch: (error) => error });

  return {
    rpush: (key, value) => attempt(() => redis.rpush(key, value)),
    ltrim: (key, start, stop) => attempt(() => redis.ltrim(key, start, stop)),
    lrange: (key, start, stop) => attempt(() => redis.lrange(key, start, stop)),
    lset: (key, index, value) => attempt(() => redis.lset(key, index, value)),
    lrem: (key, count, value) => attempt(() => redis.lrem(key, count, value)),
    del: (key) => attempt(() => redis.del(key)),
  };
};

export const makeChatEvents = (
  rabbit: RabbitMessaging["Service"],
): ChatEvents => ({
  publish: (routingKey, payload) =>
    rabbit
      .publish({
        exchange: "default",
        routingKey,
        content: new TextEncoder().encode(JSON.stringify(payload)),
      })
      .pipe(Effect.asVoid),
});

export const chatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;

    return makeChatDataLayer(makeChatRedis(redis), makeChatEvents(rabbit));
  }),
);
