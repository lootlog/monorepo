import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  GLOBAL_CHAT_MESSAGE_LIMIT,
  GLOBAL_CHAT_SEND_COOLDOWN_SECONDS,
} from "@lootlog/schema/chat";
import { Effect, Layer } from "effect";
import {
  makeGlobalChatDataLayer,
  type GlobalChatEvents,
  type GlobalChatStore,
} from "#src/http-api/handlers/global-chat/global-chat.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";

const POSITION_KEY = "global-chat:position";

const MESSAGES_KEY = "global-chat:messages";

/**
 * Scores each message by a counter instead of its time, so a page cursor keeps
 * pointing at the same message while newer ones arrive and older ones are
 * trimmed, and two messages in one millisecond keep their send order.
 */
const APPEND_SCRIPT = `
local position = redis.call("INCR", KEYS[1])
redis.call("ZADD", KEYS[2], position, ARGV[1])
redis.call("ZREMRANGEBYRANK", KEYS[2], 0, -(tonumber(ARGV[2]) + 1))
return position
`;

const PAGE_SCRIPT = `
return redis.call("ZREVRANGEBYSCORE", KEYS[1], ARGV[1], "-inf", "WITHSCORES", "LIMIT", 0, tonumber(ARGV[2]))
`;

export const makeGlobalChatStore = (
  redis: ApiRedis["Service"],
): GlobalChatStore => {
  const attempt = <A>(operation: () => PromiseLike<A>) =>
    Effect.tryPromise({ try: operation, catch: (error) => error });

  return {
    append: (value) =>
      attempt(() =>
        redis.eval(
          APPEND_SCRIPT,
          [POSITION_KEY, MESSAGES_KEY],
          [value, GLOBAL_CHAT_MESSAGE_LIMIT],
        ),
      ).pipe(Effect.asVoid),
    page: (before, count) =>
      attempt(() =>
        redis.eval<string[]>(
          PAGE_SCRIPT,
          [MESSAGES_KEY],
          [before === undefined ? "+inf" : `(${before}`, count],
        ),
      ).pipe(
        Effect.map((reply) =>
          Array.from({ length: reply.length / 2 }, (_, index) => ({
            value: reply[index * 2] ?? "",
            position: Number(reply[index * 2 + 1]),
          })),
        ),
      ),
    acquireSendSlot: (userId) =>
      attempt(() =>
        redis.setNX(
          `global-chat:cooldown:${userId}`,
          "1",
          GLOBAL_CHAT_SEND_COOLDOWN_SECONDS,
        ),
      ),
  };
};

export const makeGlobalChatEvents = (
  rabbit: RabbitMessaging["Service"],
): GlobalChatEvents => ({
  publish: (message) =>
    rabbit
      .publish({
        exchange: "default",
        routingKey: RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE,
        content: new TextEncoder().encode(JSON.stringify(message)),
      })
      .pipe(Effect.asVoid),
});

export const globalChatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;

    return makeGlobalChatDataLayer(
      makeGlobalChatStore(redis),
      makeGlobalChatEvents(rabbit),
    );
  }),
);
