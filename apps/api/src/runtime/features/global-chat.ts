import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
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
} from "#src/global-chat/global-chat.data-layer";
import type { RedisService } from "#src/redis/redis.service";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { GlobalChatAdminDirectory } from "#src/runtime/features/platform-role-directories";

const channelKeys = (world: string | undefined) => {
  const channel = `global-chat:{${world === undefined ? "all" : `world:${world}`}}`;

  return {
    position: `${channel}:position`,
    messages: `${channel}:messages`,
    pinned: `${channel}:pinned`,
  };
};

const APPEND_SCRIPT = `
local position = redis.call("INCR", KEYS[1])
redis.call("ZADD", KEYS[2], position, ARGV[1])
redis.call("ZREMRANGEBYRANK", KEYS[2], 0, -(tonumber(ARGV[2]) + 1))
return position
`;

const PAGE_SCRIPT = `
return redis.call("ZREVRANGEBYSCORE", KEYS[1], ARGV[1], "-inf", "WITHSCORES", "LIMIT", 0, tonumber(ARGV[2]))
`;

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

export const makeGlobalChatStore = (redis: RedisService): GlobalChatStore => ({
  append: (world, value) => {
    const keys = channelKeys(world);

    return redis
      .eval(
        APPEND_SCRIPT,
        [keys.position, keys.messages],
        [value, GLOBAL_CHAT_MESSAGE_LIMIT],
      )
      .pipe(Effect.asVoid);
  },
  page: (world, before, count) =>
    redis
      .eval<string[]>(
        PAGE_SCRIPT,
        [channelKeys(world).messages],
        [before === undefined ? "+inf" : `(${before}`, count],
      )
      .pipe(
        Effect.map((reply) =>
          Array.from({ length: reply.length / 2 }, (_, index) => ({
            value: reply[index * 2] ?? "",
            position: Number(reply[index * 2 + 1]),
          })),
        ),
      ),
  find: (world, id) =>
    redis
      .eval<string | null>(FIND_SCRIPT, [channelKeys(world).messages], [id])
      .pipe(Effect.map((value) => value ?? undefined)),
  remove: (world, id) =>
    redis
      .eval<number>(REMOVE_SCRIPT, [channelKeys(world).messages], [id])
      .pipe(Effect.map((removed) => removed > 0)),
  getPinned: (world) =>
    redis
      .get(channelKeys(world).pinned)
      .pipe(Effect.map((value) => value ?? undefined)),
  setPinned: (world, value) =>
    value === undefined
      ? redis.del(channelKeys(world).pinned).pipe(Effect.asVoid)
      : redis.set(channelKeys(world).pinned, value),
  acquireSendSlot: (userId) =>
    redis.setNX(
      `global-chat:cooldown:${userId}`,
      "1",
      GLOBAL_CHAT_SEND_COOLDOWN_SECONDS,
    ),
});

const publishJson = <
  Key extends
    | typeof RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE
    | typeof RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE,
>(
  rabbit: RabbitMessaging["Service"],
  routingKey: Key,
  content: CanonicalRabbitEvent<Key>,
) => rabbit.publish(eventMessage(routingKey, content)).pipe(Effect.asVoid);

const makeGlobalChatEvents = (
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
    const admins = yield* GlobalChatAdminDirectory;

    return makeGlobalChatDataLayer(
      makeGlobalChatStore(redis),
      makeGlobalChatEvents(rabbit),
      admins,
    );
  }),
).pipe(Layer.provide(GlobalChatAdminDirectory.layer));
