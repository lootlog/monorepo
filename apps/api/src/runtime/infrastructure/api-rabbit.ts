import { RabbitMessaging } from "@lootlog/messaging";
import {
  battlelogUserDataDeleteRoute,
  consumerRoute,
  RabbitRoutingKey,
} from "@lootlog/protocol/rabbit/topology";
import { Effect, Layer, Redacted } from "effect";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export const apiRabbitRoutes = {
  guildCreate: consumerRoute(
    "backend-guilds-create",
    RabbitRoutingKey.GUILDS_CREATE,
    { failure: "retry" },
  ),
  guildUpdate: consumerRoute(
    "backend-guilds-update",
    RabbitRoutingKey.GUILDS_UPDATE,
    { failure: "retry" },
  ),
  guildDelete: consumerRoute(
    "backend-guilds-delete",
    RabbitRoutingKey.GUILDS_DELETE,
    { failure: "retry" },
  ),
  roleCreate: consumerRoute(
    "backend-guilds-create-role",
    RabbitRoutingKey.GUILDS_CREATE_ROLE,
    { failure: "retry" },
  ),
  roleUpdate: consumerRoute(
    "backend-guilds-update-role",
    RabbitRoutingKey.GUILDS_UPDATE_ROLE,
    { failure: "retry" },
  ),
  roleDelete: consumerRoute(
    "backend-guilds-delete-role",
    RabbitRoutingKey.GUILDS_DELETE_ROLE,
    { failure: "retry" },
  ),
  characterOffline: consumerRoute(
    "backend-game-character-offline",
    RabbitRoutingKey.GAME_CHARACTER_OFFLINE,
    { failure: "dead-letter" },
  ),
  margonemAccountVerified: consumerRoute(
    "backend-margonem-account-verified-v1",
    RabbitRoutingKey.MARGONEM_ACCOUNT_VERIFIED_V1,
    { failure: "dead-letter" },
  ),
  presenceCoverage: consumerRoute(
    "backend-presence-coverage-check",
    RabbitRoutingKey.PRESENCE_COVERAGE_CHECK,
    { failure: "dead-letter" },
  ),
  discordGuildChannelsSynced: consumerRoute(
    "backend-discord-guild-channels-synced",
    RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNCED,
    { failure: "dead-letter" },
  ),
  discordGuildChannelUpserted: consumerRoute(
    "backend-discord-guild-channel-upserted",
    RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
    { failure: "dead-letter" },
  ),
  discordGuildChannelDeleted: consumerRoute(
    "backend-discord-guild-channel-deleted",
    RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
    { failure: "dead-letter" },
  ),
  discordGuildChannelsSyncFailed: consumerRoute(
    "backend-discord-guild-channels-sync-failed",
    RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
    { failure: "dead-letter" },
  ),
  discordGuildSyncStateUpdated: consumerRoute(
    "backend-discord-guild-sync-state-updated",
    RabbitRoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
    { failure: "dead-letter" },
  ),
  notificationsTimerUpdated: consumerRoute(
    "backend-notifications-timer-updated",
    RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    { failure: "dead-letter" },
  ),
  notificationsTimerDeleted: consumerRoute(
    "backend-notifications-timer-deleted",
    RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
    { failure: "dead-letter" },
  ),
  notificationsDeliveryResult: consumerRoute(
    "backend-notifications-delivery-result",
    RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
    { failure: "dead-letter" },
  ),
  notificationsDiscordGuildChannelDeleted: consumerRoute(
    "backend-notifications-discord-guild-channel-deleted",
    RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
    {
      failure: "dead-letter",
      deadLetterRoutingKey:
        RabbitRoutingKey.NOTIFICATIONS_DISCORD_GUILD_CHANNEL_DELETED_DLQ,
    },
  ),
  heroSightingUpdated: consumerRoute(
    "backend-notifications-hero-sighting-updated",
    RabbitRoutingKey.NOTIFICATIONS_HERO_SIGHTING_UPDATED,
    { failure: "retry", rejectToRetryQueue: false },
  ),
  lootCreated: consumerRoute(
    "backend-notifications-loot-created",
    RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
    { failure: "retry", rejectToRetryQueue: false },
  ),
  lootDrawResolved: consumerRoute(
    "backend-notifications-loot-draw-resolved",
    RabbitRoutingKey.NOTIFICATIONS_LOOT_DRAW_RESOLVED,
    { failure: "retry" },
  ),
};

export const ApiRabbitLive = Layer.unwrap(
  Effect.map(ApiRuntimeConfig, (config) =>
    RabbitMessaging.layer({
      uri: Redacted.value(config.rabbitmqUri),
      connectionName: config.serviceName,
      queues: [
        ...Object.values(apiRabbitRoutes),
        battlelogUserDataDeleteRoute,
      ].flatMap((route) => route.queues),
    }),
  ),
);
