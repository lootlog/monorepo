import { NonEmptyString, NonNegativeInt } from "@lootlog/schema/primitives";
import {
  AirTagObservationBatchSchema,
  AirTagScopeSnapshotSchema,
  AirTagUpdateEventSchema,
} from "@lootlog/schema/air-tag";
import {
  MapPingAckSchema,
  MapPingEventSchema,
  MapPingSendPayloadSchema,
} from "@lootlog/schema/map-ping";
import { Schema } from "effect";
import {
  GuildLootCreatedEventV2,
  GuildLootShareUpdatedEventV2,
  ReservationChangedEventV2,
} from "../rabbit/events.js";

export const REALTIME_PROTOCOL_VERSION = 1;
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;
export const PRESENCE_EXPIRY_MS = 60_000;

const RequestId = NonEmptyString;
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
]);
export type RealtimeLogicalTopic = typeof RealtimeLogicalTopic.Type;

export const SubscriptionScope = Schema.Struct({
  topic: RealtimeLogicalTopic,
  organizationId: Schema.optional(NonEmptyString),
  eventId: Schema.optional(NonEmptyString),
  world: Schema.optional(NonEmptyString),
  mapId: Schema.optional(NonNegativeInt),
});
export type SubscriptionScope = typeof SubscriptionScope.Type;

export const PresencePlatform = Schema.Literals(["game", "web-app"]);
export const PresenceStatus = Schema.Literals(["online", "offline"]);
export const PresenceConfidence = Schema.Literals(["verified", "reported"]);

export const PresenceClan = Schema.Struct({
  id: Schema.optional(NonNegativeInt),
  name: Schema.optional(Schema.String),
  rank: Schema.optional(Schema.Int),
});

export const PresenceCharacter = Schema.Struct({
  world: NonEmptyString,
  name: NonEmptyString,
  lvl: NonNegativeInt,
  icon: Schema.String,
  characterId: NonEmptyString,
  accountId: NonEmptyString,
  prof: Schema.String,
  clan: Schema.optional(PresenceClan),
});

export const PrecisePresenceLocation = Schema.Struct({
  mapId: Schema.optional(NonNegativeInt),
  map: NonEmptyString,
  x: Schema.optional(NonNegativeInt),
  y: Schema.optional(NonNegativeInt),
});

export const BasicPresence = Schema.Struct({
  userId: NonEmptyString,
  sessionId: NonEmptyString,
  organizationIds: Schema.Array(NonEmptyString),
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
  organizationIds: Schema.Array(NonEmptyString),
  isAfk: Schema.optional(Schema.Boolean),
  character: Schema.optional(PresenceCharacter),
  location: Schema.optional(PrecisePresenceLocation),
  clientObservedAt: Schema.optional(Timestamp),
});

export const PresenceSnapshot = Schema.Struct({
  organizationId: NonEmptyString,
  world: Schema.optional(NonEmptyString),
  revision: Revision,
  presences: Schema.Array(Schema.Union([BasicPresence, PresenceWithLocation])),
});

export const PresenceDelta = Schema.Struct({
  organizationId: NonEmptyString,
  revision: Revision,
  changes: Schema.Array(
    Schema.Union([
      Schema.Struct({
        action: Schema.Literal("upsert"),
        presence: Schema.Union([BasicPresence, PresenceWithLocation]),
      }),
      Schema.Struct({
        action: Schema.Literal("remove"),
        userId: NonEmptyString,
        sessionId: NonEmptyString,
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
    requestId: Schema.optional(RequestId),
    data,
  });

export const SessionJoinCommand = command(
  "session.join",
  Schema.Struct({
    world: Schema.optional(NonEmptyString),
    character: Schema.optional(PresenceCharacter),
    margonemAccountProof: Schema.optional(Schema.Unknown),
  }),
);
export const HeartbeatCommand = command(
  "presence.heartbeat",
  Schema.Struct({ sessionId: NonEmptyString }),
);
export const PresencePublishCommand = command(
  "presence.publish",
  PublishedPresence,
);
export const PresenceFetchCommand = command(
  "presence.fetch",
  Schema.Struct({
    organizationId: NonEmptyString,
    world: Schema.optional(NonEmptyString),
  }),
);
export const SubscribeCommand = command(
  "subscription.subscribe",
  SubscriptionScope,
);
export const UnsubscribeCommand = command(
  "subscription.unsubscribe",
  SubscriptionScope,
);
export const MapPingCommand = command(
  "map-ping.send",
  MapPingSendPayloadSchema,
);
export const AirTagSubscriptionCommand = command(
  "air-tag.subscription",
  Schema.Struct({
    requestId: RequestId,
    enabled: Schema.Boolean,
    expectedMapId: Schema.optional(NonNegativeInt),
  }),
);
export const AirTagObservationCommand = command(
  "air-tag.observation",
  AirTagObservationBatchSchema,
);

export const AirTagRejectCode = Schema.Literals([
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
export const AirTagObservationAck = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("accepted"),
    acceptedScopes: NonNegativeInt,
    acceptedTargets: NonNegativeInt,
  }),
  Schema.Struct({
    status: Schema.Literal("rejected"),
    code: AirTagRejectCode,
    retryAfterMs: Schema.optional(NonNegativeInt),
  }),
]);
export { MapPingAckSchema };

export const ClientCommand = Schema.Union([
  SessionJoinCommand,
  HeartbeatCommand,
  PresencePublishCommand,
  PresenceFetchCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  MapPingCommand,
  AirTagSubscriptionCommand,
  AirTagObservationCommand,
]);
export type ClientCommand = typeof ClientCommand.Type;

export const RealtimeError = Schema.Struct({
  code: NonEmptyString,
  message: NonEmptyString,
  retryable: Schema.Boolean,
  retryAfterMs: Schema.optional(NonNegativeInt),
  details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});
export type RealtimeError = typeof RealtimeError.Type;

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
  organizationId: NonEmptyString,
  payload: Schema.Unknown,
});

export const ServerEvent = Schema.Union([
  serverEvent(
    "session.joined",
    Schema.Struct({
      connectionId: NonEmptyString,
      organizationIds: Schema.Array(NonEmptyString),
      subscriptionScopes: Schema.Array(SubscriptionScope),
    }),
  ),
  serverEvent(
    "permissions.updated",
    Schema.Struct({
      organizationIds: Schema.Array(NonEmptyString),
      subscriptionScopes: Schema.Array(SubscriptionScope),
    }),
  ),
  serverEvent("presence.snapshot", PresenceSnapshot),
  serverEvent("presence.delta", PresenceDelta),
  serverEvent("chat.created", OrganizationEvent),
  serverEvent("chat.updated", OrganizationEvent),
  serverEvent("chat.deleted", OrganizationEvent),
  serverEvent("chat.cleared", OrganizationEvent),
  serverEvent("loot.created", GuildLootCreatedEventV2),
  serverEvent("loot.share-updated", GuildLootShareUpdatedEventV2),
  serverEvent("timer.created", OrganizationEvent),
  serverEvent("timer.deleted", OrganizationEvent),
  serverEvent("reservation.created", OrganizationEvent),
  serverEvent("reservation.deleted", OrganizationEvent),
  serverEvent("reservation.changed", ReservationChangedEventV2),
  serverEvent("notification.sent", OrganizationEvent),
  serverEvent("member-refresh.updated", OrganizationEvent),
  serverEvent("party-gathering.updated", OrganizationEvent),
  serverEvent("party-gathering.cancelled", OrganizationEvent),
  serverEvent("party-ready-room.updated", OrganizationEvent),
  serverEvent("map-ping.received", MapPingEventSchema),
  serverEvent("air-tag.updated", AirTagUpdateEventSchema),
  serverEvent("event.map-status-updated", OrganizationEvent),
  serverEvent("event.hero-killed", OrganizationEvent),
  serverEvent("event.ranking-updated", OrganizationEvent),
  serverEvent("event.respawn-window-opened", OrganizationEvent),
  serverEvent("event.respawn-window-closed", OrganizationEvent),
]);
export type ServerEvent = typeof ServerEvent.Type;

export const RealtimeFrame = Schema.Union([
  ClientCommand,
  Response,
  ServerEvent,
]);
export type RealtimeFrame = typeof RealtimeFrame.Type;

export const decodeClientCommand = Schema.decodeUnknownSync(ClientCommand);
export const decodeResponse = Schema.decodeUnknownSync(Response);
export const decodeServerEvent = Schema.decodeUnknownSync(ServerEvent);
export const decodeRealtimeFrame = Schema.decodeUnknownSync(RealtimeFrame);
