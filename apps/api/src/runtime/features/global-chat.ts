import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import {
  GLOBAL_CHAT_MESSAGE_LIMIT,
  GLOBAL_CHAT_SEND_COOLDOWN_SECONDS,
  type GlobalChatChannelUpdate,
  type GlobalChatMessage,
} from "@lootlog/schema/chat";
import { Effect, Layer } from "effect";
import {
  makeGlobalChatDataLayer,
  type GlobalChatEvents,
  type GlobalChatStore,
} from "#src/http-api/handlers/global-chat/global-chat.data-layer";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

/**
 * Each channel keeps its keys under one hash tag. The single list that
 * predates channels (`global-chat:messages`) is no longer read.
 */
const channelKeys = (world: string | undefined) => {
  const channel = `global-chat:{${world === undefined ? "all" : `world:${world}`}}`;

  return {
    position: `${channel}:position`,
    messages: `${channel}:messages`,
    pinned: `${channel}:pinned`,
  };
};

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

// Moderation is rare, so it scans the kept messages instead of indexing ids.
const FIND_SCRIPT = `
for _, value in ipairs(redis.call("ZRANGE", KEYS[1], 0, -1)) do
  local ok, message = pcall(cjson.decode, value)
  if ok and message.id == ARGV[1] then return value end
end
return false
`;

const REMOVE_SCRIPT = `
for _, value in ipairs(redis.call("ZRANGE", KEYS[1], 0, -1)) do
  local ok, message = pcall(cjson.decode, value)
  if ok and message.id == ARGV[1] then return redis.call("ZREM", KEYS[1], value) end
end
return 0
`;

export const makeGlobalChatStore = (
  redis: ApiRedis["Service"],
): GlobalChatStore => {
  const attempt = <A>(operation: () => PromiseLike<A>) =>
    Effect.tryPromise({ try: operation, catch: (error) => error });

  return {
    append: (world, value) => {
      const keys = channelKeys(world);

      return attempt(() =>
        redis.eval(
          APPEND_SCRIPT,
          [keys.position, keys.messages],
          [value, GLOBAL_CHAT_MESSAGE_LIMIT],
        ),
      ).pipe(Effect.asVoid);
    },
    page: (world, before, count) =>
      attempt(() =>
        redis.eval<string[]>(
          PAGE_SCRIPT,
          [channelKeys(world).messages],
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
    find: (world, id) =>
      attempt(() =>
        redis.eval<string | null>(
          FIND_SCRIPT,
          [channelKeys(world).messages],
          [id],
        ),
      ).pipe(Effect.map((value) => value ?? undefined)),
    remove: (world, id) =>
      attempt(() =>
        redis.eval<number>(REMOVE_SCRIPT, [channelKeys(world).messages], [id]),
      ).pipe(Effect.map((removed) => removed > 0)),
    getPinned: (world) =>
      attempt(() => redis.get(channelKeys(world).pinned)).pipe(
        Effect.map((value) => value ?? undefined),
      ),
    setPinned: (world, value) =>
      attempt<unknown>(() =>
        value === undefined
          ? redis.del(channelKeys(world).pinned)
          : redis.set(channelKeys(world).pinned, value),
      ).pipe(Effect.asVoid),
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

const publishJson = (
  rabbit: RabbitMessaging["Service"],
  routingKey: RabbitRoutingKeyName,
  content: GlobalChatMessage | GlobalChatChannelUpdate,
) =>
  rabbit
    .publish({
      exchange: "default",
      routingKey,
      content: new TextEncoder().encode(JSON.stringify(content)),
    })
    .pipe(Effect.asVoid);

export const makeGlobalChatEvents = (
  rabbit: RabbitMessaging["Service"],
): GlobalChatEvents => ({
  publish: (message) =>
    publishJson(rabbit, RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE, message),
  publishChannelUpdate: (update) =>
    publishJson(rabbit, RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE, update),
});

export const globalChatData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const { globalChatAdminUserIds } = yield* ApiRuntimeConfig;

    return makeGlobalChatDataLayer(
      makeGlobalChatStore(redis),
      makeGlobalChatEvents(rabbit),
      globalChatAdminUserIds,
    );
  }),
);
