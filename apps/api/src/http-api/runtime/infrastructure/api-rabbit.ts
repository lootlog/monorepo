import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  makeRetryQueue,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import { Queue } from "#src/rabbitmq/queue";

const queue = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
  options: Partial<RabbitQueueDefinition> = {},
): RabbitQueueDefinition => ({
  name,
  exchange: RabbitExchange.DEFAULT,
  routingKey,
  durable: true,
  ...options,
});

const retried = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
  retryRoutingKey: RabbitQueueDefinition["routingKey"],
): RabbitQueueDefinition =>
  queue(name, routingKey, {
    deadLetterExchange: RabbitExchange.RETRY,
    deadLetterRoutingKey: retryRoutingKey,
  });

export const apiRabbitQueues = [
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
  queue(
    "backend-notifications-timer-updated",
    RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
  ),
  queue(
    "backend-notifications-timer-deleted",
    RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
  ),
  queue(
    "backend-notifications-loot-created",
    RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
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
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";

export const ApiRabbitLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, (config) =>
    RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: apiRabbitQueues,
    }),
  ),
);
