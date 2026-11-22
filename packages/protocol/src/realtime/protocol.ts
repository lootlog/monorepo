import { AccessPolicySnapshot, AccessPolicyChange } from "./access-policy.js";
import { UserFeedItem } from "../feed.js";
import { CharacterAurasChangedSchema } from "@lootlog/schema/character-aura";
import { NonNegativeInt } from "@lootlog/schema/primitives";
import {
  PartyGatheringClientUpdateSchema,
  type PartyReadyRoomClientUpdate,
} from "@lootlog/schema/party-ready-room";
import {
  GlobalChatMessageSchema,
  GlobalChatStatsSchema,
  GlobalChatWorld,
} from "@lootlog/schema/chat";
import {
  AirTagMapThreatEventSchema,
  AirTagObservationBatchSchema,
  AirTagScopeSnapshotSchema,
  AirTagScopeUpdateEventSchema,
} from "@lootlog/schema/air-tag";
import {
  BattlePingEventSchema,
  BattlePingSendPayloadSchema,
} from "@lootlog/schema/battle-ping";
import {
  LootSplitAckSchema,
  LootSplitAutoAcceptedEventSchema,
  LootSplitAutoAcceptPayloadSchema,
  LootSplitEventSchema,
  LootSplitSendPayloadSchema,
} from "@lootlog/schema/loot-split";
import {
  NpcPresenceEventSchema,
  NpcPresenceReportAckSchema,
  NpcPresenceReportSchema,
  NpcPresenceSnapshotSchema,
} from "@lootlog/schema/npc-presence";
import {
  MapPingAckSchema,
  MapPingEventSchema,
  MapPingSendPayloadSchema,
} from "@lootlog/schema/map-ping";
import { Schema } from "effect";
import type { CanonicalRabbitEvent } from "../rabbit/events.js";
import type { RabbitRoutingKey } from "../rabbit/topology.js";
import type {
  ChatMessageCreated,
  ChatMessageDeleted,
  ChatMessagesCleared,
  ChatMessageUpdated,
  HeroSightingUpdated,
  LegacyReservationChanged,
  MemberRefreshJobUpdated,
  NotificationSent,
  PartyGatheringCancelled,
  PartyGatheringOpened,
  TimerDeleted,
  TimerUpdated,
} from "./organization-events.js";
import {
  GuildLootCreatedEventV2,
  GuildLootCreatedMessageV2,
  GuildLootShareUpdatedEventV2,
  ReservationChangedEventV2,
} from "../loot-events.js";

export const REALTIME_PROTOCOL_VERSION = 1;

const { feedEntry: _feedEntry, ...lootCreatedFields } =
  GuildLootCreatedMessageV2.fields;

export const LootSnapshotEvent = Schema.Struct(lootCreatedFields);

export type LootSnapshotEvent = typeof LootSnapshotEvent.Type;

export const REALTIME_JSON_SUBPROTOCOL = "lootlog.realtime.json.v1";

export const REALTIME_CLIENT_CLOSE_CODES = {
  heartbeatTimeout: 4001,
  heartbeatRejected: 4002,
  heartbeatUnavailable: 4003,
  malformedFrame: 4007,
  sessionJoinFailed: 4008,
} as const;

export const REALTIME_SERVER_CLOSE_CODES = {
  restarting: 1012,
  tryAgainLater: 1013,
} as const;

export const REALTIME_INBOUND_TIMEOUT_CLOSE_CODE = 4009;

export const REALTIME_SERVER_CLOSE_RECONNECT_WINDOW_MS = 30_000;

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;

export const PRESENCE_EXPIRY_MS = 60_000;

const RequestId = Schema.NonEmptyString;

const Revision = NonNegativeInt;

const Timestamp = NonNegativeInt;

export const RealtimeLogicalTopic = Schema.Literals([
  "organization.activity",
  "organization.chat",
  "organization.loots",
  "organization.members",
  "organization.notifications",
  "organization.presence",
  "organization.reservations",
  "organization.timers",
  "event.coordination",
  "map.air-tags",
  "map.pings",
  "party.ready-room",
  "global.chat",
  "global.chat.world",
  "global.character-auras",
]);

export type RealtimeLogicalTopic = typeof RealtimeLogicalTopic.Type;

export const SubscriptionScope = Schema.Struct({
  topic: RealtimeLogicalTopic,
  organizationId: Schema.optional(Schema.NonEmptyString),
  eventId: Schema.optional(Schema.NonEmptyString),
  world: Schema.optional(Schema.NonEmptyString),
  mapId: Schema.optional(NonNegativeInt),
});

export type SubscriptionScope = typeof SubscriptionScope.Type;

export const PresencePlatform = Schema.Literals(["game", "web-app"]);

const PresenceStatus = Schema.Literals(["online", "offline"]);

export const PresenceConfidence = Schema.Literals(["verified", "reported"]);

const PresenceClan = Schema.Struct({
  id: Schema.optional(NonNegativeInt),
  name: Schema.optional(Schema.String),
  rank: Schema.optional(Schema.Int),
});

export const PresenceCharacter = Schema.Struct({
  world: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  lvl: NonNegativeInt,
  icon: Schema.String,
  characterId: Schema.NonEmptyString,
  accountId: Schema.NonEmptyString,
  prof: Schema.String,
  clan: Schema.optional(PresenceClan),
});

const PrecisePresenceLocation = Schema.Struct({
  mapId: Schema.optional(NonNegativeInt),
  map: Schema.NonEmptyString,
  x: Schema.optional(NonNegativeInt),
  y: Schema.optional(NonNegativeInt),
});

export const BasicPresence = Schema.Struct({
  userId: Schema.NonEmptyString,
  discordId: Schema.optional(Schema.NonEmptyString),
  sessionId: Schema.NonEmptyString,
  organizationIds: Schema.Array(Schema.NonEmptyString),
  platform: PresencePlatform,
  status: PresenceStatus,
  confidence: PresenceConfidence,
  isAfk: Schema.Boolean,
  lastSeen: Timestamp,
  character: Schema.optional(PresenceCharacter),
});

export type BasicPresence = typeof BasicPresence.Type;

export const PresenceWithLocation = Schema.Struct({
  ...BasicPresence.fields,
  location: PrecisePresenceLocation,
});

export type PresenceWithLocation = typeof PresenceWithLocation.Type;

export const PublishedPresence = Schema.Struct({
  organizationIds: Schema.Array(Schema.NonEmptyString),
  isAfk: Schema.optional(Schema.Boolean),
  character: Schema.optional(PresenceCharacter),
  location: Schema.optional(PrecisePresenceLocation),
  clientObservedAt: Schema.optional(Timestamp),
});

export const PresenceSnapshot = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  world: Schema.optional(Schema.NonEmptyString),
  revision: Revision,
  presences: Schema.Array(Schema.Union([PresenceWithLocation, BasicPresence])),
});

const PresenceDelta = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  revision: Revision,
  changes: Schema.Array(
    Schema.Union([
      Schema.Struct({
        action: Schema.Literal("upsert"),
        presence: Schema.Union([PresenceWithLocation, BasicPresence]),
      }),
      Schema.Struct({
        action: Schema.Literal("remove"),
        userId: Schema.NonEmptyString,
        discordId: Schema.optional(Schema.NonEmptyString),
        sessionId: Schema.NonEmptyString,
      }),
    ]),
  ),
});

const command = <
  Type extends string,
  Data extends Schema.Codec<unknown, unknown>,
>(
  type: Type,
  data: Data,
) =>
  Schema.Struct({
    v: Schema.Literal(REALTIME_PROTOCOL_VERSION),
    type: Schema.Literal(type),
    requestId: RequestId,
    data,
  });

const SessionJoinCommand = command(
  "session.join",
  Schema.Struct({
    world: Schema.optional(Schema.NonEmptyString),
    character: Schema.optional(PresenceCharacter),
    margonemAccountProof: Schema.optional(Schema.Unknown),
    features: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  }),
);

export const CHARACTER_AURAS_FEATURE = "character-auras";

export const KILL_STATS_FEATURE = "kill-stats";

const HeartbeatCommand = command(
  "presence.heartbeat",
  Schema.Struct({ sessionId: Schema.NonEmptyString }),
);

const PresencePublishCommand = command("presence.publish", PublishedPresence);

const PingCommand = command("connection.ping", Schema.Struct({}));

const PresenceFetchCommand = command(
  "presence.fetch",
  Schema.Struct({
    organizationId: Schema.NonEmptyString,
    world: Schema.optional(Schema.NonEmptyString),
    delivery: Schema.optional(Schema.Literal("response")),
  }),
);

const SubscribeCommand = command("subscription.subscribe", SubscriptionScope);

const UnsubscribeCommand = command(
  "subscription.unsubscribe",
  SubscriptionScope,
);

const MapPingCommand = command("map-ping.send", MapPingSendPayloadSchema);

const BattlePingCommand = command(
  "battle-ping.send",
  BattlePingSendPayloadSchema,
);

const LootSplitCommand = command("loot-split.send", LootSplitSendPayloadSchema);

const LootSplitAutoAcceptCommand = command(
  "loot-split.auto-accept",
  LootSplitAutoAcceptPayloadSchema,
);

const AirTagSubscriptionCommand = command(
  "air-tag.subscription",
  Schema.Struct({
    requestId: RequestId,
    enabled: Schema.Boolean,
    expectedMapId: Schema.optional(NonNegativeInt),
  }),
);

const AirTagObservationCommand = command(
  "air-tag.observation",
  AirTagObservationBatchSchema,
);

const AirTagMapThreatsFetchCommand = command(
  "air-tag.map-threats.fetch",
  Schema.Struct({
    organizationId: Schema.NonEmptyString,
    world: Schema.NonEmptyString,
  }),
);

const AirTagMapThreatsFetchResponse = Schema.Struct({
  threats: Schema.Array(AirTagMapThreatEventSchema),
});

const NpcPresenceReportCommand = command(
  "npc-presence.report",
  NpcPresenceReportSchema,
);

const NpcPresenceFetchCommand = command(
  "npc-presence.fetch",
  Schema.Struct({
    organizationId: Schema.NonEmptyString,
    world: Schema.NonEmptyString,
  }),
);

const AirTagRejectCode = Schema.Literals([
  "forbidden",
  "invalid-context",
  "invalid-payload",
  "rate-limited",
  "temporarily-unavailable",
]);

export const AirTagSubscriptionAck = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("accepted"),
    requestId: RequestId,
    scopes: Schema.Array(AirTagScopeSnapshotSchema),
  }),
  Schema.Struct({
    status: Schema.Literal("rejected"),
    requestId: RequestId,
    code: AirTagRejectCode,
  }),
]);

const AirTagObservationAck = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("accepted"),
    acceptedScopes: NonNegativeInt,
    acceptedTargets: NonNegativeInt,
    standbyTargetIds: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  }),
  Schema.Struct({
    status: Schema.Literal("rejected"),
    code: AirTagRejectCode,
    retryAfterMs: Schema.optional(NonNegativeInt),
  }),
]);

export const ClientCommand = Schema.Union([
  SessionJoinCommand,
  HeartbeatCommand,
  PingCommand,
  PresencePublishCommand,
  PresenceFetchCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  MapPingCommand,
  BattlePingCommand,
  LootSplitCommand,
  LootSplitAutoAcceptCommand,
  AirTagSubscriptionCommand,
  AirTagObservationCommand,
  AirTagMapThreatsFetchCommand,
  NpcPresenceReportCommand,
  NpcPresenceFetchCommand,
]);

export type ClientCommand = typeof ClientCommand.Type;

export const SessionJoined = Schema.Struct({
  connectionId: Schema.NonEmptyString,
  organizationIds: Schema.Array(Schema.NonEmptyString),
  subscriptionScopes: Schema.Array(SubscriptionScope),
  accessPolicy: AccessPolicySnapshot,
});

export type SessionJoined = typeof SessionJoined.Type;

const ScopeAck = Schema.Struct({ scope: SubscriptionScope });

export const CommandSuccess = {
  "session.join": SessionJoined,
  "presence.heartbeat": Schema.Struct({ lastSeen: Timestamp }),
  "connection.ping": Schema.Struct({}),
  "presence.publish": Schema.UndefinedOr(
    Schema.Union([PresenceWithLocation, BasicPresence]),
  ),
  "presence.fetch": PresenceSnapshot,
  "subscription.subscribe": ScopeAck,
  "subscription.unsubscribe": ScopeAck,
  "map-ping.send": MapPingAckSchema,
  "battle-ping.send": MapPingAckSchema,
  "loot-split.send": LootSplitAckSchema,
  "loot-split.auto-accept": LootSplitAckSchema,
  "air-tag.subscription": AirTagSubscriptionAck,
  "air-tag.observation": AirTagObservationAck,
  "air-tag.map-threats.fetch": AirTagMapThreatsFetchResponse,
  "npc-presence.report": NpcPresenceReportAckSchema,
  "npc-presence.fetch": NpcPresenceSnapshotSchema,
} as const satisfies {
  readonly [Type in ClientCommand["type"]]: Schema.Codec<unknown, unknown>;
};

export type CommandSuccess<Type extends ClientCommand["type"]> =
  (typeof CommandSuccess)[Type]["Type"];

export const ORGANIZATION_ACCESS_DENIED_MESSAGE = "organization access denied";

const RealtimeError = Schema.Struct({
  code: Schema.NonEmptyString,
  message: Schema.NonEmptyString,
  retryable: Schema.Boolean,
  retryAfterMs: Schema.optional(NonNegativeInt),
  details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

type RealtimeError = typeof RealtimeError.Type;

export const Response = Schema.Union([
  Schema.Struct({
    v: Schema.Literal(REALTIME_PROTOCOL_VERSION),
    requestId: RequestId,
    status: Schema.Literal("success"),
    data: Schema.optional(Schema.Unknown),
  }),
  Schema.Struct({
    v: Schema.Literal(REALTIME_PROTOCOL_VERSION),
    requestId: RequestId,
    status: Schema.Literal("error"),
    error: RealtimeError,
  }),
]);

export type Response = typeof Response.Type;

const serverEvent = <
  Type extends string,
  Data extends Schema.Codec<unknown, unknown>,
>(
  type: Type,
  data: Data,
) =>
  Schema.Struct({
    v: Schema.Literal(REALTIME_PROTOCOL_VERSION),
    type: Schema.Literal(type),
    sequence: Schema.optional(Revision),
    data,
  });

const OrganizationEvent = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  payload: Schema.Unknown,
});

export const ServerEvent = Schema.Union([
  serverEvent(
    "session.hello",
    Schema.Struct({ connectionId: Schema.NonEmptyString }),
  ),
  serverEvent("session.joined", SessionJoined),
  serverEvent(
    "permissions.updated",
    Schema.Struct({
      changes: Schema.Array(AccessPolicyChange),
      organizationIds: Schema.Array(Schema.NonEmptyString),
      subscriptionScopes: Schema.Array(SubscriptionScope),
      accessPolicy: AccessPolicySnapshot,
    }),
  ),
  serverEvent("presence.snapshot", PresenceSnapshot),
  serverEvent("presence.delta", PresenceDelta),
  serverEvent("chat.created", OrganizationEvent),
  serverEvent("chat.updated", OrganizationEvent),
  serverEvent("chat.deleted", OrganizationEvent),
  serverEvent("chat.cleared", OrganizationEvent),
  serverEvent("global-chat.created", GlobalChatMessageSchema),
  serverEvent(
    "global-chat.deleted",
    Schema.Struct({
      world: Schema.optionalKey(GlobalChatWorld),
      id: Schema.NonEmptyString,
    }),
  ),
  serverEvent(
    "global-chat.pinned",
    Schema.Struct({
      world: Schema.optionalKey(GlobalChatWorld),
      message: Schema.NullOr(GlobalChatMessageSchema),
    }),
  ),
  serverEvent("global-chat.stats", GlobalChatStatsSchema),
  serverEvent("character-auras.changed", CharacterAurasChangedSchema),
  serverEvent("feed.entry", UserFeedItem),
  serverEvent(
    "kills.changed",
    Schema.Struct({ guildId: Schema.NonEmptyString }),
  ),
  serverEvent("kill-stats.changed", Schema.Struct({})),
  serverEvent("loot.created", GuildLootCreatedEventV2),
  serverEvent("loot.share-updated", GuildLootShareUpdatedEventV2),
  serverEvent("loot.snapshot", LootSnapshotEvent),
  serverEvent("timer.created", OrganizationEvent),
  serverEvent("timer.deleted", OrganizationEvent),
  serverEvent("hero-sighting.updated", OrganizationEvent),
  serverEvent("reservation.created", OrganizationEvent),
  serverEvent("reservation.deleted", OrganizationEvent),
  serverEvent("reservation.changed", ReservationChangedEventV2),
  serverEvent("notification.sent", OrganizationEvent),
  serverEvent("notification.going", OrganizationEvent),
  serverEvent("member-refresh.updated", OrganizationEvent),
  serverEvent("party-gathering.updated", OrganizationEvent),
  serverEvent("party-gathering.cancelled", OrganizationEvent),
  serverEvent(
    "party-gathering.state-updated",
    Schema.Struct({
      organizationId: Schema.NonEmptyString,
      payload: PartyGatheringClientUpdateSchema,
    }),
  ),
  serverEvent("party-ready-room.updated", OrganizationEvent),
  serverEvent("map-ping.received", MapPingEventSchema),
  serverEvent("battle-ping.received", BattlePingEventSchema),
  serverEvent("loot-split.received", LootSplitEventSchema),
  serverEvent("loot-split.auto-accepted", LootSplitAutoAcceptedEventSchema),
  serverEvent("air-tag.scope-updated", AirTagScopeUpdateEventSchema),
  serverEvent("air-tag.map-threat-updated", AirTagMapThreatEventSchema),
  serverEvent("npc-presence.updated", NpcPresenceEventSchema),
  serverEvent("event.map-status-updated", OrganizationEvent),
  serverEvent("event.hero-killed", OrganizationEvent),
  serverEvent("event.ranking-updated", OrganizationEvent),
  serverEvent("event.respawn-window-opened", OrganizationEvent),
  serverEvent("event.respawn-window-closed", OrganizationEvent),
  serverEvent(
    "notification.volunteer",
    Schema.Struct({
      notificationId: Schema.NonEmptyString,
      volunteer: Schema.StructWithRest(
        Schema.Struct({
          discordId: Schema.NonEmptyString,
          world: Schema.NonEmptyString,
        }),
        [Schema.Record(Schema.String, Schema.Unknown)],
      ),
    }),
  ),
]);

export type ServerEvent = typeof ServerEvent.Type;

type UnreadPayloadEvents = {
  [
    Event in ServerEvent as Event["data"] extends { readonly payload: unknown }
      ? unknown extends Event["data"]["payload"]
        ? Event["type"]
        : never
      : never
  ]: Event;
};

type EveryUnreadPayload<
  Payloads extends Record<keyof UnreadPayloadEvents, unknown>,
> = Payloads;

type OrganizationEventPayloads = EveryUnreadPayload<{
  "chat.created": ChatMessageCreated;
  "chat.updated": ChatMessageUpdated;
  "chat.deleted": ChatMessageDeleted;
  "chat.cleared": ChatMessagesCleared;
  "timer.created": TimerUpdated;
  "timer.deleted": TimerDeleted;
  "hero-sighting.updated": HeroSightingUpdated;
  "reservation.created": LegacyReservationChanged;
  "reservation.deleted": LegacyReservationChanged;
  "notification.sent": NotificationSent;
  "notification.going": CanonicalRabbitEvent<
    typeof RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING
  >;
  "member-refresh.updated": MemberRefreshJobUpdated;
  "party-gathering.updated": PartyGatheringOpened;
  "party-gathering.cancelled": PartyGatheringCancelled;
  "party-ready-room.updated": PartyReadyRoomClientUpdate;
  "event.map-status-updated": CanonicalRabbitEvent<
    typeof RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE
  >;
  "event.hero-killed": CanonicalRabbitEvent<
    typeof RabbitRoutingKey.EVENT_HERO_KILLED
  >;
  "event.ranking-updated": CanonicalRabbitEvent<
    typeof RabbitRoutingKey.EVENT_RANKING_UPDATE
  >;
  "event.respawn-window-opened": CanonicalRabbitEvent<
    typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED
  >;
  "event.respawn-window-closed": CanonicalRabbitEvent<
    typeof RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED
  >;
}>;

export type ServerEventPayload<Type extends ServerEvent["type"]> =
  Type extends keyof OrganizationEventPayloads
    ? OrganizationEventPayloads[Type]
    : Extract<ServerEvent, { type: Type }>["data"] extends infer Data
      ? Data extends { readonly payload: infer Payload }
        ? Payload
        : Data
      : never;

export const RealtimeFrame = Schema.Union([
  ClientCommand,
  Response,
  ServerEvent,
]);

export type RealtimeFrame = typeof RealtimeFrame.Type;

export const decodeClientCommand = Schema.decodeUnknownSync(ClientCommand);

export const decodeServerEvent = Schema.decodeUnknownSync(ServerEvent);

export const decodeRealtimeFrame = Schema.decodeUnknownSync(RealtimeFrame);

const serverEventTypes = new Set<string>(
  ServerEvent.members.map((member) => member.fields.type.literal),
);

export const isServerEventFrame = (
  frame: RealtimeFrame,
): frame is ServerEvent => "type" in frame && serverEventTypes.has(frame.type);
