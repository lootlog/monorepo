import { RabbitMessaging, type FailurePolicy } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  makeQueue as queue,
  makeRetryQueue,
  type RabbitQueueDefinition,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import { Queue } from "#src/rabbitmq/queue";

const retried = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
  retryRoutingKey: RabbitQueueDefinition["routingKey"],
): RabbitQueueDefinition =>
  queue(name, routingKey, {
    deadLetterExchange: RabbitExchange.RETRY,
    deadLetterRoutingKey: retryRoutingKey,
  });

// Presence facts describe current state, so a failed one waits only briefly
// before its retry to limit how long a newer fact can overtake it.
const PRESENCE_RETRY_TTL_MS = 5_000;

export const apiRabbitQueues = [
  queue(Queue.GAME_CHARACTER_OFFLINE, RabbitRoutingKey.GAME_CHARACTER_OFFLINE),
  makeRetryQueue({
    name: Queue.GAME_CHARACTER_OFFLINE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GAME_CHARACTER_OFFLINE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GAME_CHARACTER_OFFLINE,
    messageTtl: PRESENCE_RETRY_TTL_MS,
  }),
  queue(
    Queue.GAME_CHARACTER_OFFLINE_DLQ,
    RabbitRoutingKey.GAME_CHARACTER_OFFLINE_DLQ,
    { exchange: RabbitExchange.DEAD_LETTER },
  ),
  retried(
    Queue.GUILDS_CREATE,
    RabbitRoutingKey.GUILDS_CREATE,
    RabbitRoutingKey.GUILDS_CREATE_RETRY,
  ),
  retried(
    Queue.GUILDS_UPDATE,
    RabbitRoutingKey.GUILDS_UPDATE,
    RabbitRoutingKey.GUILDS_UPDATE_RETRY,
  ),
  retried(
    Queue.GUILDS_DELETE,
    RabbitRoutingKey.GUILDS_DELETE,
    RabbitRoutingKey.GUILDS_DELETE_RETRY,
  ),
  retried(
    Queue.GUILDS_CREATE_ROLE,
    RabbitRoutingKey.GUILDS_CREATE_ROLE,
    RabbitRoutingKey.GUILDS_CREATE_ROLE_RETRY,
  ),
  retried(
    Queue.GUILDS_UPDATE_ROLE,
    RabbitRoutingKey.GUILDS_UPDATE_ROLE,
    RabbitRoutingKey.GUILDS_UPDATE_ROLE_RETRY,
  ),
  retried(
    Queue.GUILDS_DELETE_ROLE,
    RabbitRoutingKey.GUILDS_DELETE_ROLE,
    RabbitRoutingKey.GUILDS_DELETE_ROLE_RETRY,
  ),
  makeRetryQueue({
    name: Queue.GUILDS_CREATE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GUILDS_CREATE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_CREATE,
  }),
  makeRetryQueue({
    name: Queue.GUILDS_UPDATE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GUILDS_UPDATE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_UPDATE,
  }),
  makeRetryQueue({
    name: Queue.GUILDS_DELETE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GUILDS_DELETE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_DELETE,
  }),
  makeRetryQueue({
    name: Queue.GUILDS_CREATE_ROLE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GUILDS_CREATE_ROLE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_CREATE_ROLE,
  }),
  makeRetryQueue({
    name: Queue.GUILDS_UPDATE_ROLE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GUILDS_UPDATE_ROLE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_UPDATE_ROLE,
  }),
  makeRetryQueue({
    name: Queue.GUILDS_DELETE_ROLE_RETRY,
    retryRoutingKey: RabbitRoutingKey.GUILDS_DELETE_ROLE_RETRY,
    destinationRoutingKey: RabbitRoutingKey.GUILDS_DELETE_ROLE,
  }),
  queue(Queue.GUILDS_CREATE_DLQ, RabbitRoutingKey.GUILDS_CREATE_DLQ, {
    exchange: RabbitExchange.DEAD_LETTER,
  }),
  queue(Queue.GUILDS_UPDATE_DLQ, RabbitRoutingKey.GUILDS_UPDATE_DLQ, {
    exchange: RabbitExchange.DEAD_LETTER,
  }),
  queue(Queue.GUILDS_DELETE_DLQ, RabbitRoutingKey.GUILDS_DELETE_DLQ, {
    exchange: RabbitExchange.DEAD_LETTER,
  }),
  queue(Queue.GUILDS_CREATE_ROLE_DLQ, RabbitRoutingKey.GUILDS_CREATE_ROLE_DLQ, {
    exchange: RabbitExchange.DEAD_LETTER,
  }),
  queue(Queue.GUILDS_UPDATE_ROLE_DLQ, RabbitRoutingKey.GUILDS_UPDATE_ROLE_DLQ, {
    exchange: RabbitExchange.DEAD_LETTER,
  }),
  queue(Queue.GUILDS_DELETE_ROLE_DLQ, RabbitRoutingKey.GUILDS_DELETE_ROLE_DLQ, {
    exchange: RabbitExchange.DEAD_LETTER,
  }),
  queue(
    "backend-discord-guild-channels-synced",
    RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNCED,
  ),
  queue(
    "backend-discord-guild-channel-upserted",
    RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
  ),
  queue(
    "backend-discord-guild-channel-deleted",
    RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
  ),
  queue(
    "backend-discord-guild-channels-sync-failed",
    RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
  ),
  queue(
    "backend-discord-guild-sync-state-updated",
    RabbitRoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
  ),
  queue(
    Queue.PRESENCE_COVERAGE_CHECK,
    RabbitRoutingKey.PRESENCE_COVERAGE_CHECK,
  ),
  makeRetryQueue({
    name: Queue.PRESENCE_COVERAGE_CHECK_RETRY,
    retryRoutingKey: RabbitRoutingKey.PRESENCE_COVERAGE_CHECK_RETRY,
    destinationRoutingKey: RabbitRoutingKey.PRESENCE_COVERAGE_CHECK,
    messageTtl: PRESENCE_RETRY_TTL_MS,
  }),
  queue(
    Queue.PRESENCE_COVERAGE_CHECK_DLQ,
    RabbitRoutingKey.PRESENCE_COVERAGE_CHECK_DLQ,
    { exchange: RabbitExchange.DEAD_LETTER },
  ),
  queue(
    "backend-notifications-timer-updated",
    RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
  ),
  queue(
    "backend-notifications-timer-deleted",
    RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
  ),
  queue(
    Queue.NOTIFICATIONS_LOOT_CREATED,
    RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
  ),
  makeRetryQueue({
    name: Queue.NOTIFICATIONS_LOOT_CREATED_RETRY,
    retryRoutingKey: RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED_RETRY,
    destinationRoutingKey: RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
  }),
  queue(
    Queue.NOTIFICATIONS_LOOT_CREATED_DLQ,
    RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED_DLQ,
    { exchange: RabbitExchange.DEAD_LETTER },
  ),
  queue(
    "backend-notifications-delivery-result",
    RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
  ),
  queue(
    "backend-notifications-discord-guild-channel-deleted",
    RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
  ),
] as const satisfies ReadonlyArray<RabbitQueueDefinition>;

const rabbitRetryPolicy = (
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
): Extract<FailurePolicy, { strategy: "retry" }> => ({
  strategy: "retry",
  maxRetries: 3,
  retryRoutingKey,
  deadLetterRoutingKey,
});

// Each retry and dead-letter routing key needs a queue declared above: the
// broker silently drops a message published to an unbound routing key.
export const apiRabbitRetry = {
  guildCreate: rabbitRetryPolicy(
    RabbitRoutingKey.GUILDS_CREATE_RETRY,
    RabbitRoutingKey.GUILDS_CREATE_DLQ,
  ),
  guildUpdate: rabbitRetryPolicy(
    RabbitRoutingKey.GUILDS_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_UPDATE_DLQ,
  ),
  guildDelete: rabbitRetryPolicy(
    RabbitRoutingKey.GUILDS_DELETE_RETRY,
    RabbitRoutingKey.GUILDS_DELETE_DLQ,
  ),
  roleCreate: rabbitRetryPolicy(
    RabbitRoutingKey.GUILDS_CREATE_ROLE_RETRY,
    RabbitRoutingKey.GUILDS_CREATE_ROLE_DLQ,
  ),
  roleUpdate: rabbitRetryPolicy(
    RabbitRoutingKey.GUILDS_UPDATE_ROLE_RETRY,
    RabbitRoutingKey.GUILDS_UPDATE_ROLE_DLQ,
  ),
  roleDelete: rabbitRetryPolicy(
    RabbitRoutingKey.GUILDS_DELETE_ROLE_RETRY,
    RabbitRoutingKey.GUILDS_DELETE_ROLE_DLQ,
  ),
  characterOffline: rabbitRetryPolicy(
    RabbitRoutingKey.GAME_CHARACTER_OFFLINE_RETRY,
    RabbitRoutingKey.GAME_CHARACTER_OFFLINE_DLQ,
  ),
  presenceCoverage: rabbitRetryPolicy(
    RabbitRoutingKey.PRESENCE_COVERAGE_CHECK_RETRY,
    RabbitRoutingKey.PRESENCE_COVERAGE_CHECK_DLQ,
  ),
  lootCreated: rabbitRetryPolicy(
    RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED_RETRY,
    RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED_DLQ,
  ),
} as const;

import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export const ApiRabbitLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, (config) =>
    RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: apiRabbitQueues,
    }),
  ),
);
