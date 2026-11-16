import type { CanonicalRabbitEventRoutingKey } from "@lootlog/protocol/rabbit/events";
import {
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import { Option, Schema } from "effect";

interface ConsumerSpec {
  readonly queue: string;
  readonly routingKey: CanonicalRabbitEventRoutingKey;
  readonly retryRoutingKey?: RabbitRoutingKeyName;
  readonly deadLetterRoutingKey?: RabbitRoutingKeyName;
  readonly installRetryQueue?: boolean;
  /** Deliveries handled at once; 1 keeps the queue's order. */
  readonly prefetch?: number;
}

// A role edit queues one event per role holder, and each rebalance can wait
// on the API. Rebalances read current permissions and are idempotent, so they
// need no order and run side by side.
const MEMBER_ACCESS_PREFETCH = 8;

const retryable = <Key extends CanonicalRabbitEventRoutingKey>(
  queue: string,
  routingKey: Key,
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
  installRetryQueue = true,
): ConsumerSpec & { readonly routingKey: Key } => ({
  queue,
  routingKey,
  retryRoutingKey,
  deadLetterRoutingKey,
  installRetryQueue,
});

const consumerSpecs = [
  retryable(
    "gateway-guilds-kills-accepted-v1",
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1,
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1_RETRY,
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1_DLQ,
  ),
  retryable(
    "gateway-guilds-timers-update",
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-timers-delete",
    RabbitRoutingKey.GUILDS_TIMERS_DELETE,
    RabbitRoutingKey.GUILDS_TIMERS_DELETE_RETRY,
    RabbitRoutingKey.GUILDS_TIMERS_DELETE_DLQ,
  ),
  retryable(
    "gateway-guilds-hero-sightings-update",
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE,
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-loots-create",
    RabbitRoutingKey.GUILDS_LOOTS_CREATE,
    RabbitRoutingKey.GUILDS_LOOTS_CREATE_RETRY,
    RabbitRoutingKey.GUILDS_LOOTS_CREATE_DLQ,
  ),
  retryable(
    "gateway-guilds-loots-share-update",
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE_RETRY,
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
  ),
  retryable(
    "gateway-guilds-reservations-create",
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE_RETRY,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
  ),
  retryable(
    "gateway-guilds-reservations-delete",
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE,
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE_RETRY,
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
  ),
  retryable(
    "gateway-guilds-reservations-v2-changed",
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_RETRY,
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
  ),
  retryable(
    "gateway-character-auras-changed",
    RabbitRoutingKey.CHARACTER_AURAS_CHANGED,
    RabbitRoutingKey.CHARACTER_AURAS_CHANGED_RETRY,
    RabbitRoutingKey.CHARACTER_AURAS_CHANGED_DLQ,
  ),
  retryable(
    "gateway-global-chat-channel-update",
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE,
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE_RETRY,
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE_DLQ,
  ),
  retryable(
    "gateway-global-chat-send-message",
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE,
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE_RETRY,
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE_DLQ,
  ),
  retryable(
    "gateway-guilds-send-message",
    RabbitRoutingKey.GUILDS_SEND_MESSAGE,
    RabbitRoutingKey.GUILDS_SEND_MESSAGE_RETRY,
    RabbitRoutingKey.GUILDS_SEND_MESSAGE_DLQ,
  ),
  retryable(
    "gateway-guilds-members-add",
    RabbitRoutingKey.GUILDS_MEMBERS_ADD,
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_RETRY,
    RabbitRoutingKey.GUILDS_MEMBERS_ADD_DLQ,
  ),
  {
    ...retryable(
      "gateway-guilds-members-update",
      RabbitRoutingKey.GUILDS_MEMBERS_UPDATE,
      RabbitRoutingKey.GUILDS_MEMBERS_UPDATE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  {
    ...retryable(
      "gateway-guilds-members-remove",
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  {
    ...retryable(
      "gateway-guilds-members-add-role",
      RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE,
      RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  {
    ...retryable(
      "gateway-guilds-members-remove-role",
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
      RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    ),
    prefetch: MEMBER_ACCESS_PREFETCH,
  },
  retryable(
    "gateway-guilds-send-notification",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND_RETRY,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
  ),
  retryable(
    "gateway-guilds-notifications-volunteer",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_RETRY,
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
    false,
  ),
  // No retry or DLQ: each answer carries the whole list and the answering
  // client already has it from HTTP, so a lost push heals on the next answer.
  {
    queue: "gateway-guilds-notifications-going",
    routingKey: RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING,
  },
  // No retry or DLQ: a refresh hint; a lost one heals on the next kill or
  // the statistics' own staleness.
  {
    queue: "gateway-users-kill-stats-changed",
    routingKey: RabbitRoutingKey.USERS_KILL_STATS_CHANGED,
  },
  retryable(
    "gateway-users-party-ready-room-updated",
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED_RETRY,
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED_DLQ,
  ),
  retryable(
    "gateway-guilds-party-gathering",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_RETRY,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_DLQ,
    false,
  ),
  retryable(
    "gateway-guilds-party-gathering-updated",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED_RETRY,
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED_DLQ,
  ),
  {
    queue: "gateway-guilds-party-gathering-cancel",
    routingKey: RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
  },
  {
    queue: "gateway-guilds-update-message",
    routingKey: RabbitRoutingKey.GUILDS_UPDATE_MESSAGE,
  },
  {
    queue: "gateway-guilds-delete-message",
    routingKey: RabbitRoutingKey.GUILDS_DELETE_MESSAGE,
  },
  {
    queue: "gateway-guilds-clear-messages",
    routingKey: RabbitRoutingKey.GUILDS_CLEAR_MESSAGES,
  },
  {
    queue: "gateway-guilds-members-refresh-job-update",
    routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
  },
  {
    queue: "gateway-event-map-status-update",
    routingKey: RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE,
  },
  {
    queue: "gateway-event-hero-killed",
    routingKey: RabbitRoutingKey.EVENT_HERO_KILLED,
  },
  {
    queue: "gateway-event-ranking-update",
    routingKey: RabbitRoutingKey.EVENT_RANKING_UPDATE,
  },
  {
    queue: "gateway-event-respawn-window-opened",
    routingKey: RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
  },
  {
    queue: "gateway-event-respawn-window-closed",
    routingKey: RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
  },
  {
    queue: "gateway-presence-check-request",
    routingKey: RabbitRoutingKey.PRESENCE_CHECK_REQUEST,
  },
] as const;

export type ConsumedRoutingKey = (typeof consumerSpecs)[number]["routingKey"];

export const gatewayConsumerSpecs: ReadonlyArray<
  ConsumerSpec & { readonly routingKey: ConsumedRoutingKey }
> = consumerSpecs;

export const gatewayQueueDefinitions: ReadonlyArray<RabbitQueueDefinition> =
  gatewayConsumerSpecs.flatMap((spec) => {
    const mainBase = {
      name: spec.queue,
      exchange: RabbitExchange.DEFAULT,
      routingKey: spec.routingKey,
      durable: true,
    };

    const main: RabbitQueueDefinition = spec.retryRoutingKey
      ? {
          ...mainBase,
          deadLetterExchange: RabbitExchange.RETRY,
          deadLetterRoutingKey: spec.retryRoutingKey,
        }
      : mainBase;

    if (!spec.retryRoutingKey || !spec.deadLetterRoutingKey) return [main];

    const retryQueue: RabbitQueueDefinition = {
      name: `${spec.queue}.retry`,
      exchange: RabbitExchange.RETRY,
      routingKey: spec.retryRoutingKey,
      durable: true,
      messageTtl: 30_000,
      deadLetterExchange: RabbitExchange.DEFAULT,
      deadLetterRoutingKey: spec.routingKey,
    };

    const deadLetterQueue: RabbitQueueDefinition = {
      name: `${spec.queue}.dlq`,
      exchange: RabbitExchange.DEAD_LETTER,
      routingKey: spec.deadLetterRoutingKey,
      durable: true,
    };

    return spec.installRetryQueue === false
      ? [main, deadLetterQueue]
      : [main, retryQueue, deadLetterQueue];
  });

export const gatewayDeadLetterSpecs = gatewayConsumerSpecs.flatMap((spec) =>
  spec.deadLetterRoutingKey
    ? [
        {
          queue: `${spec.queue}.dlq`,
          routingKey: spec.deadLetterRoutingKey,
        },
      ]
    : [],
);

const decodeJsonRecord = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);

const decodeRecord = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Unknown),
);

const decodeString = Schema.decodeUnknownOption(Schema.String);

const decodeNumber = Schema.decodeUnknownOption(Schema.Number);

// Identifies a dead-lettered delivery without logging its payload or any
// member's Discord ID. Each field decodes on its own, because a delivery that
// failed validation is the likeliest one to reach the DLQ.
export const deadLetterIdentifiers = (content: Uint8Array) => {
  const payload = decodeJsonRecord(new TextDecoder().decode(content));
  const field = (key: string) => Option.map(payload, (data) => data[key]);

  return {
    guildId: Option.getOrUndefined(
      Option.flatMap(field("guildId"), decodeString),
    ),
    notificationId: Option.getOrUndefined(
      Option.flatMap(field("notificationId"), decodeString),
    ),
    revision: Option.getOrUndefined(
      Option.flatMap(field("revision"), decodeNumber),
    ),
    updateType: Option.getOrUndefined(
      field("update").pipe(
        Option.flatMap(decodeRecord),
        Option.flatMap((update) => decodeString(update.type)),
      ),
    ),
  };
};
