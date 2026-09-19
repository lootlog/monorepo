import { AccessPolicySnapshot, AccessPolicyChange } from "./access-policy.js";
import { UserFeedItem } from "../feed.js";
import { NonNegativeInt } from "@lootlog/schema/primitives";
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

// Offered alongside v1 by clients that understand feed events; never selected as the wire protocol.
export const REALTIME_FEED_CAPABILITY = "lootlog.feed.v1";

export const REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY =
  "lootlog.notification-volunteer.v1";

export const REALTIME_SUBPROTOCOL = "lootlog.realtime.v1";

export const REALTIME_JSON_SUBPROTOCOL = "lootlog.realtime.json.v1";

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
  // Match the richer shape first so the basic schema does not strip location.
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
    requestId: Schema.optional(RequestId),
    data,
  });

const SessionJoinCommand = command(
  "session.join",
  Schema.Struct({
    world: Schema.optional(Schema.NonEmptyString),
    character: Schema.optional(PresenceCharacter),
    margonemAccountProof: Schema.optional(Schema.Unknown),
  }),
);

const HeartbeatCommand = command(
  "presence.heartbeat",
  Schema.Struct({ sessionId: Schema.NonEmptyString }),
);

const PresencePublishCommand = command("presence.publish", PublishedPresence);

const PresenceFetchCommand = command(
  "presence.fetch",
  Schema.Struct({
    organizationId: Schema.NonEmptyString,
    world: Schema.optional(Schema.NonEmptyString),
  }),
);

const SubscribeCommand = command("subscription.subscribe", SubscriptionScope);

const UnsubscribeCommand = command(
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
    "session.joined",
    Schema.Struct({
      connectionId: Schema.NonEmptyString,
      organizationIds: Schema.Array(Schema.NonEmptyString),
      subscriptionScopes: Schema.Array(SubscriptionScope),
      accessPolicy: Schema.optional(AccessPolicySnapshot),
    }),
  ),
  serverEvent(
    "permissions.updated",
    Schema.Struct({
      changes: Schema.optional(Schema.Array(AccessPolicyChange)),
      organizationIds: Schema.Array(Schema.NonEmptyString),
      subscriptionScopes: Schema.Array(SubscriptionScope),
      accessPolicy: Schema.optional(AccessPolicySnapshot),
    }),
  ),
  serverEvent("presence.snapshot", PresenceSnapshot),
  serverEvent("presence.delta", PresenceDelta),
  serverEvent("chat.created", OrganizationEvent),
  serverEvent("chat.updated", OrganizationEvent),
  serverEvent("chat.deleted", OrganizationEvent),
  serverEvent("chat.cleared", OrganizationEvent),
  serverEvent("feed.entry", UserFeedItem),
  serverEvent(
    "kills.changed",
    Schema.Struct({ guildId: Schema.NonEmptyString }),
  ),
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

export const RealtimeFrame = Schema.Union([
  ClientCommand,
  Response,
  ServerEvent,
]);

export type RealtimeFrame = typeof RealtimeFrame.Type;

export const decodeClientCommand = Schema.decodeUnknownSync(ClientCommand);

export const decodeServerEvent = Schema.decodeUnknownSync(ServerEvent);

export const decodeRealtimeFrame = Schema.decodeUnknownSync(RealtimeFrame);

// Discriminate an already decoded frame without parsing its payload a second time.
const serverEventTypes = new Set<string>(
  ServerEvent.members.map((member) => member.fields.type.literal),
);

export const isServerEventFrame = (
  frame: RealtimeFrame,
): frame is ServerEvent => "type" in frame && serverEventTypes.has(frame.type);
