import {
  consumerRoute,
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Option, Schema } from "effect";

// A role edit queues one event per role holder, and each rebalance can wait
// on the API. Rebalances read current permissions and are idempotent, so they
// need no order and run side by side.
const MEMBER_ACCESS_PREFETCH = 8;

export const gatewayRoutes = [
  consumerRoute(
    "gateway-guilds-kills-accepted-v1",
    RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-timers-update",
    RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-timers-delete",
    RabbitRoutingKey.GUILDS_TIMERS_DELETE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-hero-sightings-update",
    RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-loots-create",
    RabbitRoutingKey.GUILDS_LOOTS_CREATE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-loots-share-update",
    RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-reservations-create",
    RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-reservations-delete",
    RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-reservations-v2-changed",
    RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-character-auras-changed",
    RabbitRoutingKey.CHARACTER_AURAS_CHANGED,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-global-chat-channel-update",
    RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-global-chat-send-message",
    RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-send-message",
    RabbitRoutingKey.GUILDS_SEND_MESSAGE,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-members-update",
    RabbitRoutingKey.GUILDS_MEMBERS_UPDATE,
    { failure: "retry", prefetch: MEMBER_ACCESS_PREFETCH },
  ),
  consumerRoute(
    "gateway-guilds-members-remove",
    RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
    { failure: "retry", prefetch: MEMBER_ACCESS_PREFETCH },
  ),
  consumerRoute(
    "gateway-guilds-send-notification",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-notifications-volunteer",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
    { failure: "retry" },
  ),
  // No retry or DLQ: each answer carries the whole list and the answering
  // client already has it from HTTP, so a lost push heals on the next answer.
  consumerRoute(
    "gateway-guilds-notifications-going",
    RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING,
    { failure: "nack" },
  ),
  // No retry or DLQ: a refresh hint; a lost one heals on the next kill or
  // the statistics' own staleness.
  consumerRoute(
    "gateway-users-kill-stats-changed",
    RabbitRoutingKey.USERS_KILL_STATS_CHANGED,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-users-party-ready-room-updated",
    RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-party-gathering",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-party-gathering-updated",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
    { failure: "retry" },
  ),
  consumerRoute(
    "gateway-guilds-party-gathering-cancel",
    RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-guilds-update-message",
    RabbitRoutingKey.GUILDS_UPDATE_MESSAGE,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-guilds-delete-message",
    RabbitRoutingKey.GUILDS_DELETE_MESSAGE,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-guilds-clear-messages",
    RabbitRoutingKey.GUILDS_CLEAR_MESSAGES,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-guilds-members-refresh-job-update",
    RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-event-map-status-update",
    RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-event-hero-killed",
    RabbitRoutingKey.EVENT_HERO_KILLED,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-event-ranking-update",
    RabbitRoutingKey.EVENT_RANKING_UPDATE,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-event-respawn-window-opened",
    RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-event-respawn-window-closed",
    RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
    { failure: "nack" },
  ),
  consumerRoute(
    "gateway-presence-check-request",
    RabbitRoutingKey.PRESENCE_CHECK_REQUEST,
    { failure: "nack" },
  ),
] as const;

export type ConsumedRoutingKey = (typeof gatewayRoutes)[number]["routingKey"];

export const gatewayQueueDefinitions: ReadonlyArray<RabbitQueueDefinition> =
  gatewayRoutes.flatMap((route) => route.queues);

export const gatewayDeadLetterQueues = gatewayQueueDefinitions.filter(
  (queue) => queue.exchange === RabbitExchange.DEAD_LETTER,
);

const decodeJsonRecord = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);

const decodeRecord = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Unknown),
);

const decodeString = Schema.decodeUnknownOption(Schema.String);

const decodeNumber = Schema.decodeUnknownOption(Schema.Finite);

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
