import { Match, Schema } from "effect";

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
  USERS_ONLINE_CHECKPOINT_V1: "users.online.checkpoint.v1",
  ACTIVITY_LOG_CREATE: "activity.log.create",
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
  CHARACTER_AURAS_CHANGED: "character-auras.changed",
  GLOBAL_CHAT_CHANNEL_UPDATE: "global-chat.channel.update",
  GLOBAL_CHAT_SEND_MESSAGE: "global-chat.send.message",
  GUILDS_CLEAR_MESSAGES: "guilds.clear.messages",
  GUILDS_CREATE: "guilds.create",
  GUILDS_CREATE_ROLE: "guilds.create.role",
  GUILDS_DELETE: "guilds.delete",
  GUILDS_DELETE_MESSAGE: "guilds.delete.message",
  GUILDS_DELETE_ROLE: "guilds.delete.role",
  GUILDS_HERO_SIGHTINGS_UPDATE: "guilds.hero-sightings.update",
  GUILDS_KILLS_ACCEPTED_V1: "guilds.kills.accepted.v1",
  GUILDS_LOOTS_CREATE: "guilds.loots.create",
  GUILDS_LOOTS_SHARE_UPDATE: "guilds.loots.share.update",
  GUILDS_MEMBERS_REFRESH_JOB_UPDATE: "guilds.members.refresh.job.update",
  GUILDS_MEMBERS_REMOVE: "guilds.members.remove",
  GUILDS_MEMBERS_UPDATE: "guilds.members.update",
  GUILDS_NOTIFICATIONS_SEND: "guilds.notifications.send",
  GUILDS_NOTIFICATIONS_VOLUNTEER: "guilds.notifications.volunteer",
  GUILDS_NOTIFICATIONS_GOING: "guilds.notifications.going",
  GUILDS_PARTY_GATHERING: "guilds.party-gathering",
  GUILDS_PARTY_GATHERING_CANCEL: "guilds.party-gathering.cancel",
  GUILDS_PARTY_GATHERING_UPDATED: "guilds.party-gathering.updated",
  GUILDS_RESERVATIONS_CHANGED_V2: "guilds.reservations.v2.changed",
  GUILDS_RESERVATIONS_CREATE: "guilds.reservations.create",
  GUILDS_RESERVATIONS_DELETE: "guilds.reservations.delete",
  GUILDS_SEND_MESSAGE: "guilds.send.message",
  GUILDS_TIMERS_DELETE: "guilds.timers.delete",
  GUILDS_TIMERS_UPDATE: "guilds.timers.update",
  GUILDS_UPDATE: "guilds.update",
  GUILDS_UPDATE_MESSAGE: "guilds.update.message",
  GUILDS_UPDATE_ROLE: "guilds.update.role",
  NOTIFICATIONS_DELIVERY_RESULT: "notifications.delivery.result",
  NOTIFICATIONS_DISCORD_GUILD_CHANNEL_DELETED_DLQ:
    "notifications.discord.guild.channel.deleted.dlq",
  NOTIFICATIONS_DISCORD_SEND: "notifications.discord.send",
  NOTIFICATIONS_HERO_SIGHTING_UPDATED: "notifications.hero-sighting.updated",
  NOTIFICATIONS_LOOT_CREATED: "notifications.loot.created",
  NOTIFICATIONS_LOOT_DRAW_RESOLVED: "notifications.loot-draw.resolved",
  NOTIFICATIONS_TIMER_DELETED: "notifications.timer.deleted",
  NOTIFICATIONS_TIMER_UPDATED: "notifications.timer.updated",
  GAME_CHARACTER_OFFLINE: "game.character.offline",
  MARGONEM_ACCOUNT_VERIFIED_V1: "margonem.account.verified.v1",
  PRESENCE_CHECK_REQUEST: "presence.check.request",
  PRESENCE_COVERAGE_CHECK: "presence.coverage.check",
  CATALOG_ITEMS_INDEX: "catalog.items.index",
  CATALOG_ITEMS_REPLAY: "catalog.items.replay",
  CATALOG_ITEMS_RETIRED_DROPS: "catalog.items.retired-drops",
  CATALOG_ITEMS_REVISIONS: "catalog.items.revisions",
  CATALOG_NPCS_INDEX: "catalog.npcs.index",
  CATALOG_NPCS_REPLAY: "catalog.npcs.replay",
  CATALOG_NPCS_LOCATIONS: "catalog.npcs.locations",
  CATALOG_DLQ: "catalog.dlq",
  SEARCH_PLAYERS_INDEX: "search.players.index",
  SEARCH_PLAYERS_REPLAY: "search.players.replay",
  USERS_PARTY_READY_ROOM_UPDATED: "users.party-ready-room.updated",
  USERS_KILL_STATS_CHANGED: "users.kill-stats.changed",
} as const;

export type RabbitEventRoutingKey =
  (typeof RabbitRoutingKey)[keyof typeof RabbitRoutingKey];

export type RabbitRoutingKeyName =
  | RabbitEventRoutingKey
  | `${RabbitEventRoutingKey}.retry`
  | `${RabbitEventRoutingKey}.dlq`;

export const retryRoutingKey = <Key extends RabbitEventRoutingKey>(
  routingKey: Key,
): `${Key}.retry` => `${routingKey}.retry`;

export const deadLetterRoutingKey = <Key extends RabbitEventRoutingKey>(
  routingKey: Key,
): `${Key}.dlq` => `${routingKey}.dlq`;

const DEFAULT_RETRY_TTL_MS = 30_000;

const MAX_DELAYED_RETRIES = 3;

export interface RabbitQueueDefinition {
  readonly name: string;
  readonly exchange: RabbitExchangeName;
  readonly routingKey: RabbitRoutingKeyName;
  readonly durable: boolean;
  readonly messageTtl?: number;
  readonly singleActiveConsumer?: boolean;
  readonly deadLetterExchange?: RabbitExchangeName;
  readonly deadLetterRoutingKey?: RabbitRoutingKeyName;
}

export type FailurePolicy =
  | { readonly strategy: "nack" }
  | { readonly strategy: "requeue" }
  | {
      readonly strategy: "retry";
      readonly maxRetries: number;
      readonly retryRoutingKey: RabbitRoutingKeyName;
      readonly deadLetterRoutingKey: RabbitRoutingKeyName;
    }
  | {
      readonly strategy: "dead-letter";
      readonly deadLetterRoutingKey: RabbitRoutingKeyName;
    };

export const makeDeadLetterQueue = (options: {
  name: string;
  routingKey: RabbitRoutingKeyName;
}): RabbitQueueDefinition => ({
  name: options.name,
  exchange: RabbitExchange.DEAD_LETTER,
  routingKey: options.routingKey,
  durable: true,
});

export const makeQueue = (
  name: string,
  routingKey: RabbitRoutingKeyName,
  options: Partial<RabbitQueueDefinition> = {},
): RabbitQueueDefinition => ({
  name,
  exchange: RabbitExchange.DEFAULT,
  routingKey,
  durable: true,
  ...options,
});

export type ConsumerFailure =
  | "retry"
  | "broker-retry"
  | "dead-letter"
  | "requeue"
  | "nack";

export interface ConsumerRoute<
  Key extends RabbitEventRoutingKey = RabbitEventRoutingKey,
> {
  readonly queue: string;
  readonly routingKey: Key;
  readonly prefetch: number;
  readonly failurePolicy: FailurePolicy;
  readonly queues: ReadonlyArray<RabbitQueueDefinition>;
}

export const consumerRoute = <Key extends RabbitEventRoutingKey>(
  queue: string,
  routingKey: Key,
  options: {
    readonly failure: ConsumerFailure;
    readonly prefetch?: number;
    readonly singleActiveConsumer?: true;
    readonly deadLetterRoutingKey?: RabbitRoutingKeyName;
    readonly rejectToRetryQueue?: false;
  },
): ConsumerRoute<Key> => {
  const retryKey = retryRoutingKey(routingKey);

  const deadLetterKey =
    options.deadLetterRoutingKey ?? deadLetterRoutingKey(routingKey);

  const retries =
    options.failure === "retry" || options.failure === "broker-retry";

  const deadLetters = retries || options.failure === "dead-letter";

  const main = makeQueue(queue, routingKey, {
    ...(options.singleActiveConsumer && { singleActiveConsumer: true }),
    ...(retries &&
      options.rejectToRetryQueue !== false && {
        deadLetterExchange: RabbitExchange.RETRY,
        deadLetterRoutingKey: retryKey,
      }),
  });

  const retryQueue: RabbitQueueDefinition = {
    name: `${queue}.retry`,
    exchange: RabbitExchange.RETRY,
    routingKey: retryKey,
    durable: true,
    messageTtl: DEFAULT_RETRY_TTL_MS,
    deadLetterExchange: RabbitExchange.DEFAULT,
    deadLetterRoutingKey: routingKey,
  };

  const deadLetterQueue = makeDeadLetterQueue({
    name: `${queue}.dlq`,
    routingKey: deadLetterKey,
  });

  const failurePolicy = Match.value(options.failure).pipe(
    Match.withReturnType<FailurePolicy>(),
    Match.when("retry", () => ({
      strategy: "retry",
      maxRetries: MAX_DELAYED_RETRIES,
      retryRoutingKey: retryKey,
      deadLetterRoutingKey: deadLetterKey,
    })),
    Match.when("dead-letter", () => ({
      strategy: "dead-letter",
      deadLetterRoutingKey: deadLetterKey,
    })),
    Match.when("broker-retry", () => ({ strategy: "nack" })),
    Match.when("requeue", () => ({ strategy: "requeue" })),
    Match.when("nack", () => ({ strategy: "nack" })),
    Match.exhaustive,
  );

  return {
    queue,
    routingKey,
    prefetch: options.prefetch ?? 1,
    failurePolicy,
    queues: [
      main,
      ...(retries ? [retryQueue] : []),
      ...(deadLetters ? [deadLetterQueue] : []),
    ],
  };
};
