import { Schema } from "effect";

export const RabbitExchange = {
  DEFAULT: "default",
  DEAD_LETTER: "dlx",
  RETRY: "retry",
} as const;

export const RabbitExchangeName = Schema.Literals([
  RabbitExchange.DEFAULT,
  RabbitExchange.DEAD_LETTER,
  RabbitExchange.RETRY,
]);
export type RabbitExchangeName = typeof RabbitExchangeName.Type;

export const RabbitRoutingKey = {
  ACTIVITY_LOG_CREATE: "activity.log.create",
  ACTIVITY_LOG_CREATE_DLQ: "activity.log.create.dlq",
  ACTIVITY_LOG_CREATE_RETRY: "activity.log.create.retry",
  DISCORD_GUILD_CHANNEL_DELETED: "discord.guild.channel.deleted",
  DISCORD_GUILD_CHANNEL_UPSERTED: "discord.guild.channel.upserted",
  DISCORD_GUILD_CHANNELS_SYNC_FAILED: "discord.guild.channels.sync.failed",
  DISCORD_GUILD_CHANNELS_SYNCED: "discord.guild.channels.synced",
  DISCORD_GUILD_SYNC_STATE_UPDATED: "discord.guild.sync-state.updated",
  EVENT_HERO_KILLED: "event.hero.killed",
  EVENT_MAP_STATUS_UPDATE: "event.map-status.update",
  EVENT_RANKING_UPDATE: "event.ranking.update",
  EVENT_RESPAWN_WINDOW_CLOSED: "event.respawn-window.closed",
  EVENT_RESPAWN_WINDOW_OPENED: "event.respawn-window.opened",
  GUILDS_CLEAR_MESSAGES: "guilds.clear.messages",
  GUILDS_CREATE: "guilds.create",
  GUILDS_CREATE_DLQ: "guilds.create.dlq",
  GUILDS_CREATE_RETRY: "guilds.create.retry",
  GUILDS_CREATE_ROLE: "guilds.create.role",
  GUILDS_CREATE_ROLE_DLQ: "guilds.create.role.dlq",
  GUILDS_CREATE_ROLE_RETRY: "guilds.create.role.retry",
  GUILDS_DELETE: "guilds.delete",
  GUILDS_DELETE_DLQ: "guilds.delete.dlq",
  GUILDS_DELETE_MESSAGE: "guilds.delete.message",
  GUILDS_DELETE_RETRY: "guilds.delete.retry",
  GUILDS_DELETE_ROLE: "guilds.delete.role",
  GUILDS_DELETE_ROLE_DLQ: "guilds.delete.role.dlq",
  GUILDS_DELETE_ROLE_RETRY: "guilds.delete.role.retry",
  GUILDS_INITIALIZE: "guilds.initialize",
  GUILDS_INITIALIZE_BOT: "guilds.initialize-bot",
  GUILDS_INITIALIZE_DLQ: "guilds.initialize.dlq",
  GUILDS_INITIALIZE_RETRY: "guilds.initialize.retry",
  GUILDS_LOOTS_CREATE: "guilds.loots.create",
  GUILDS_LOOTS_CREATE_DLQ: "guilds.loots.create.dlq",
  GUILDS_LOOTS_CREATE_RETRY: "guilds.loots.create.retry",
  GUILDS_LOOTS_DELETE: "guilds.loots.delete",
  GUILDS_LOOTS_SHARE_UPDATE: "guilds.loots.share.update",
  GUILDS_LOOTS_SHARE_UPDATE_DLQ: "guilds.loots.share.update.dlq",
  GUILDS_LOOTS_SHARE_UPDATE_RETRY: "guilds.loots.share.update.retry",
  GUILDS_LOOTS_UPDATE: "guilds.loots.update",
  GUILDS_MEMBERS_ADD: "guilds.members.add",
  GUILDS_MEMBERS_ADD_DLQ: "guilds.members.add.dlq",
  GUILDS_MEMBERS_ADD_RETRY: "guilds.members.add.retry",
  GUILDS_MEMBERS_ADD_ROLE: "guilds.members.add.role",
  GUILDS_MEMBERS_ADD_ROLE_DLQ: "guilds.members.add.role.dlq",
  GUILDS_MEMBERS_ADD_ROLE_RETRY: "guilds.members.add.role.retry",
  GUILDS_MEMBERS_REFRESH_JOB_UPDATE: "guilds.members.refresh.job.update",
  GUILDS_MEMBERS_REMOVE: "guilds.members.remove",
  GUILDS_MEMBERS_REMOVE_DLQ: "guilds.members.remove.dlq",
  GUILDS_MEMBERS_REMOVE_RETRY: "guilds.members.remove.retry",
  GUILDS_MEMBERS_REMOVE_ROLE: "guilds.members.remove.role",
  GUILDS_MEMBERS_REMOVE_ROLE_DLQ: "guilds.members.remove.role.dlq",
  GUILDS_MEMBERS_REMOVE_ROLE_RETRY: "guilds.members.remove.role.retry",
  GUILDS_MEMBERS_UPDATE: "guilds.members.update",
  GUILDS_MEMBERS_UPDATE_DLQ: "guilds.members.update.dlq",
  GUILDS_MEMBERS_UPDATE_RETRY: "guilds.members.update.retry",
  GUILDS_NOTIFICATIONS_SEND: "guilds.notifications.send",
  GUILDS_NOTIFICATIONS_SEND_DLQ: "guilds.notifications.send.dlq",
  GUILDS_NOTIFICATIONS_SEND_RETRY: "guilds.notifications.send.retry",
  GUILDS_NOTIFICATIONS_VOLUNTEER: "guilds.notifications.volunteer",
  GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ: "guilds.notifications.volunteer.dlq",
  GUILDS_NOTIFICATIONS_VOLUNTEER_RETRY: "guilds.notifications.volunteer.retry",
  GUILDS_PARTY_GATHERING: "guilds.party-gathering",
  GUILDS_PARTY_GATHERING_CANCEL: "guilds.party-gathering.cancel",
  GUILDS_PARTY_GATHERING_DLQ: "guilds.party-gathering.dlq",
  GUILDS_PARTY_GATHERING_RETRY: "guilds.party-gathering.retry",
  GUILDS_RESERVATIONS_CHANGED_V2: "guilds.reservations.v2.changed",
  GUILDS_RESERVATIONS_CHANGED_V2_DLQ: "guilds.reservations.v2.changed.dlq",
  GUILDS_RESERVATIONS_CHANGED_V2_RETRY: "guilds.reservations.v2.changed.retry",
  GUILDS_RESERVATIONS_CREATE: "guilds.reservations.create",
  GUILDS_RESERVATIONS_CREATE_DLQ: "guilds.reservations.create.dlq",
  GUILDS_RESERVATIONS_CREATE_RETRY: "guilds.reservations.create.retry",
  GUILDS_RESERVATIONS_DELETE: "guilds.reservations.delete",
  GUILDS_RESERVATIONS_DELETE_DLQ: "guilds.reservations.delete.dlq",
  GUILDS_RESERVATIONS_DELETE_RETRY: "guilds.reservations.delete.retry",
  GUILDS_SEND_MESSAGE: "guilds.send.message",
  GUILDS_SEND_MESSAGE_DLQ: "guilds.send.message.dlq",
  GUILDS_SEND_MESSAGE_RETRY: "guilds.send.message.retry",
  GUILDS_SYNC: "guilds.sync",
  GUILDS_SYNC_TRIGGER: "guilds.sync.trigger",
  GUILDS_TIMERS_CREATE: "guilds.timers.create",
  GUILDS_TIMERS_DELETE: "guilds.timers.delete",
  GUILDS_TIMERS_DELETE_DLQ: "guilds.timers.delete.dlq",
  GUILDS_TIMERS_DELETE_RETRY: "guilds.timers.delete.retry",
  GUILDS_TIMERS_UPDATE: "guilds.timers.update",
  GUILDS_TIMERS_UPDATE_DLQ: "guilds.timers.update.dlq",
  GUILDS_TIMERS_UPDATE_RETRY: "guilds.timers.update.retry",
  GUILDS_TIMER_UPDATE: "guilds.timer.update",
  GUILDS_UPDATE: "guilds.update",
  GUILDS_UPDATE_DLQ: "guilds.update.dlq",
  GUILDS_UPDATE_MESSAGE: "guilds.update.message",
  GUILDS_UPDATE_RETRY: "guilds.update.retry",
  GUILDS_UPDATE_ROLE: "guilds.update.role",
  GUILDS_UPDATE_ROLE_DLQ: "guilds.update.role.dlq",
  GUILDS_UPDATE_ROLE_RETRY: "guilds.update.role.retry",
  NOTIFICATIONS_DELIVERY_RESULT: "notifications.delivery.result",
  NOTIFICATIONS_DISCORD_SEND: "notifications.discord.send",
  NOTIFICATIONS_LOOT_CREATED: "notifications.loot.created",
  NOTIFICATIONS_TIMER_DELETED: "notifications.timer.deleted",
  NOTIFICATIONS_TIMER_UPDATED: "notifications.timer.updated",
  PRESENCE_CHECK_REQUEST: "presence.check.request",
  PRESENCE_COVERAGE_CHECK: "presence.coverage.check",
  SEARCH_ITEMS_INDEX: "search.items.index",
  SEARCH_NPCS_INDEX: "search.npcs.index",
  SEARCH_PLAYERS_INDEX: "search.players.index",
  USERS_PARTY_READY_ROOM_UPDATED: "users.party-ready-room.updated",
  USERS_PARTY_READY_ROOM_UPDATED_DLQ: "users.party-ready-room.updated.dlq",
  USERS_PARTY_READY_ROOM_UPDATED_RETRY: "users.party-ready-room.updated.retry",
} as const;

export const RabbitRoutingKeyName = Schema.Literals(
  Object.values(RabbitRoutingKey),
);
export type RabbitRoutingKeyName = typeof RabbitRoutingKeyName.Type;

export const DEFAULT_RETRY_TTL_MS = 30_000;

export const RabbitExchangeDefinition = Schema.Struct({
  name: RabbitExchangeName,
  type: Schema.Literal("topic"),
  durable: Schema.Boolean,
});
export type RabbitExchangeDefinition = typeof RabbitExchangeDefinition.Type;

export const RabbitQueueDefinition = Schema.Struct({
  name: Schema.String,
  exchange: RabbitExchangeName,
  routingKey: RabbitRoutingKeyName,
  durable: Schema.Boolean,
  messageTtl: Schema.optional(Schema.Int),
  deadLetterExchange: Schema.optional(RabbitExchangeName),
  deadLetterRoutingKey: Schema.optional(RabbitRoutingKeyName),
});
export type RabbitQueueDefinition = typeof RabbitQueueDefinition.Type;

export const canonicalExchanges = [
  { name: RabbitExchange.DEFAULT, type: "topic", durable: true },
  { name: RabbitExchange.RETRY, type: "topic", durable: true },
  { name: RabbitExchange.DEAD_LETTER, type: "topic", durable: true },
] as const satisfies ReadonlyArray<RabbitExchangeDefinition>;

export const makeRetryQueue = (options: {
  name: string;
  retryRoutingKey: RabbitRoutingKeyName;
  destinationRoutingKey: RabbitRoutingKeyName;
  messageTtl?: number;
}): RabbitQueueDefinition => ({
  name: options.name,
  exchange: RabbitExchange.RETRY,
  routingKey: options.retryRoutingKey,
  durable: true,
  messageTtl: options.messageTtl ?? DEFAULT_RETRY_TTL_MS,
  deadLetterExchange: RabbitExchange.DEFAULT,
  deadLetterRoutingKey: options.destinationRoutingKey,
});

export const makeDeadLetterQueue = (options: {
  name: string;
  routingKey: RabbitRoutingKeyName;
}): RabbitQueueDefinition => ({
  name: options.name,
  exchange: RabbitExchange.DEAD_LETTER,
  routingKey: options.routingKey,
  durable: true,
});
