import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import {
  makeChatDataLayer,
  type ChatEvents,
  type ChatRedis,
} from "#src/chat/chat.data-layer";
import type { RedisEffects } from "#src/redis/redis.service";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

// Moderation-rare scan over at most CHAT_MESSAGE_LIMIT elements.
const REPLACE_SCRIPT = `
for index, value in ipairs(redis.call("LRANGE", KEYS[1], 0, -1)) do
  if value == ARGV[1] then
    redis.call("LSET", KEYS[1], index - 1, ARGV[2])
    return 1
  end
end
return 0
`;

export const makeChatRedis = (redis: RedisEffects): ChatRedis => ({
  rpush: redis.rpush,
  ltrim: redis.ltrim,
  lrange: redis.lrange,
  replace: (key, previous, next) =>
    redis
      .eval<number>(REPLACE_SCRIPT, [key], [previous, next])
      .pipe(Effect.map((replaced) => replaced === 1)),
  lrem: redis.lrem,
  del: redis.del,
});

export const makeChatEvents = (
  rabbit: RabbitMessaging["Service"],
): ChatEvents => ({
  publish: (routingKey, payload) =>
    rabbit.publish(eventMessage(routingKey, payload)).pipe(Effect.asVoid),
});

export const chatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;

    return makeChatDataLayer(
      makeChatRedis(redis.effect),
      makeChatEvents(rabbit),
    );
  }),
);
