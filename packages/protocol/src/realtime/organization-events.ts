/**
 * Payloads of the Organization events the gateway forwards from the API
 * unread, as JSON on the wire. Payloads that the API also serves over HTTP
 * mirror that response.
 */
import { Schema } from "effect";
import {
  HeroSightingCloseReasonSchema,
  HeroSightingStateSchema,
} from "@lootlog/schema/hero-sightings";
import {
  DateTimeString,
  FiniteNumber,
  NonEmptyString,
} from "@lootlog/schema/http-scalars";
import { ProfessionSchema } from "@lootlog/schema/loot";
import { NpcRoutingTierSchema } from "@lootlog/schema/npc-routing";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { CapabilitySchema } from "@lootlog/schema/permissions";

const MessageRouting = Schema.Union([
  Schema.Struct({ tier: Schema.Literal("base") }),
  Schema.Struct({ tier: NpcRoutingTierSchema, npcLevel: FiniteNumber }),
]);

const ChatCharacter = Schema.Struct({
  nick: NonEmptyString,
  id: FiniteNumber,
  acc: FiniteNumber,
  lvl: FiniteNumber,
  prof: NonEmptyString,
  icon: NonEmptyString,
});

const ChatNpc = Schema.Struct({
  world: Schema.optionalKey(NonEmptyString),
  id: FiniteNumber,
  name: NonEmptyString,
  location: NonEmptyString,
  lvl: FiniteNumber,
  prof: Schema.optionalKey(NonEmptyString),
  wt: FiniteNumber,
  hpp: Schema.optionalKey(FiniteNumber),
  icon: NonEmptyString,
  // The Margonem NPC type number as the client reported it.
  type: FiniteNumber,
  isHeroFromEvent: Schema.optionalKey(Schema.Boolean),
  x: Schema.optionalKey(FiniteNumber),
  y: Schema.optionalKey(FiniteNumber),
});

const partyGatheringDetailsFields = {
  description: Schema.optionalKey(Schema.String),
  minLvl: Schema.optionalKey(FiniteNumber),
  maxLvl: Schema.optionalKey(FiniteNumber),
};

/** `chat.created`: the stored message, with the gateway's answer for each viewer. */
export const ChatMessageCreated = Schema.Struct({
  id: NonEmptyString,
  guildId: NonEmptyString,
  message: Schema.String,
  senderId: NonEmptyString,
  timestamp: DateTimeString,
  type: Schema.Literals(["NORMAL", "NOTIFICATION", "NPC", "PARTY_GATHERING"]),
  characterData: ChatCharacter,
  npc: Schema.optionalKey(ChatNpc),
  partyGathering: Schema.optionalKey(
    Schema.Struct({
      notificationId: NonEmptyString,
      discordId: NonEmptyString,
      ...partyGatheringDetailsFields,
      world: NonEmptyString,
    }),
  ),
  replyTo: Schema.optionalKey(
    Schema.Struct({
      messageId: NonEmptyString,
      senderNick: NonEmptyString,
      message: Schema.String,
      type: Schema.Literals(["NORMAL", "NOTIFICATION"]),
    }),
  ),
  canDelete: Schema.Boolean,
});

export type ChatMessageCreated = typeof ChatMessageCreated.Encoded;

export const ChatMessageUpdated = Schema.Struct({
  guildId: NonEmptyString,
  messageId: NonEmptyString,
  message: Schema.String,
  routing: MessageRouting,
});

export type ChatMessageUpdated = typeof ChatMessageUpdated.Encoded;

export const ChatMessageDeleted = Schema.Struct({
  guildId: NonEmptyString,
  messageId: NonEmptyString,
  routing: MessageRouting,
});

export type ChatMessageDeleted = typeof ChatMessageDeleted.Encoded;

export const ChatMessagesCleared = Schema.Struct({ guildId: NonEmptyString });

export type ChatMessagesCleared = typeof ChatMessagesCleared.Encoded;

const nullableNumber = Schema.NullOr(FiniteNumber);

const TimerMember = Schema.Struct({
  id: FiniteNumber,
  userId: Schema.String,
  guildId: Schema.String,
  type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
  name: Schema.String,
  avatar: Schema.NullOr(Schema.String),
  banner: Schema.NullOr(Schema.String),
  active: Schema.Boolean,
  // The API sends none today.
  roles: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        guildId: Schema.String,
        name: Schema.String,
        color: nullableNumber,
        position: Schema.optionalKey(nullableNumber),
        permissions: Schema.mutable(Schema.Array(CapabilitySchema)),
        lvlRangeFrom: Schema.optionalKey(nullableNumber),
        lvlRangeTo: Schema.optionalKey(nullableNumber),
      }),
    ),
  ),
  globalUserId: Schema.NullOr(Schema.String),
  lastDiscordSyncAt: Schema.NullOr(DateTimeString),
  updatedAt: DateTimeString,
});

/** `timer.created`: the API's timer response. */
export const TimerUpdated = Schema.Struct({
  guildId: Schema.String,
  npcId: FiniteNumber,
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: DateTimeString,
  maxSpawnTime: DateTimeString,
  npc: Schema.Struct({
    id: FiniteNumber,
    templateId: Schema.NullOr(FiniteNumber),
    name: Schema.String,
    prof: Schema.String,
    location: Schema.String,
    wt: Schema.String,
    lvl: FiniteNumber,
    type: NpcTypeSchema,
    icon: Schema.NullOr(Schema.String),
    margonemType: Schema.String,
  }),
  wasReset: Schema.Boolean,
  member: Schema.optionalKey(TimerMember),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      name: Schema.String,
      prof: Schema.NullOr(ProfessionSchema),
      icon: Schema.NullOr(Schema.String),
      lvl: Schema.NullOr(FiniteNumber),
      characterId: FiniteNumber,
      accountId: FiniteNumber,
    }),
  ),
  deletedAt: Schema.NullOr(DateTimeString),
  entranceClosesAt: Schema.NullOr(DateTimeString),
  updatedAt: DateTimeString,
});

export type TimerUpdated = typeof TimerUpdated.Encoded;

export const TimerDeleted = Schema.Struct({
  npcId: FiniteNumber,
  timerKey: NonEmptyString,
  world: NonEmptyString,
  guildId: NonEmptyString,
  routing: Schema.Struct({
    tier: NpcRoutingTierSchema,
    npcLevel: Schema.optionalKey(FiniteNumber),
  }),
});

export type TimerDeleted = typeof TimerDeleted.Encoded;

const HeroSightingMember = Schema.Struct({
  memberId: FiniteNumber,
  userId: Schema.NullOr(Schema.String),
  displayName: Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
});

const HeroSightingCharacter = Schema.Struct({
  name: Schema.String,
  lvl: Schema.NullOr(FiniteNumber),
  prof: Schema.NullOr(ProfessionSchema),
  icon: Schema.NullOr(Schema.String),
});

/** `hero-sighting.updated`: the API's sighting response. */
export const HeroSightingUpdated = Schema.Struct({
  id: FiniteNumber,
  guildId: Schema.String,
  world: Schema.String,
  hero: Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    lvl: FiniteNumber,
    prof: Schema.NullOr(ProfessionSchema),
  }),
  state: HeroSightingStateSchema,
  mapName: Schema.String,
  firstSeenAt: DateTimeString,
  lastSeenAt: DateTimeString,
  spawnedAt: Schema.NullOr(DateTimeString),
  closedAt: Schema.NullOr(DateTimeString),
  closeReason: Schema.NullOr(HeroSightingCloseReasonSchema),
  detectedBy: HeroSightingMember,
  detectorCharacter: Schema.NullOr(HeroSightingCharacter),
  lastSeenBy: HeroSightingMember,
  claims: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        member: HeroSightingMember,
        character: Schema.NullOr(HeroSightingCharacter),
        createdAt: DateTimeString,
      }),
    ),
  ),
});

export type HeroSightingUpdated = typeof HeroSightingUpdated.Encoded;

/**
 * `reservation.created` and `reservation.deleted`, kept beside
 * `reservation.changed` for clients that predate it.
 */
export const LegacyReservationChanged = Schema.Struct({
  guildId: NonEmptyString,
  reservation: Schema.Struct({
    id: FiniteNumber,
    // The reserved spot's id.
    reservationId: Schema.String,
    createdDate: DateTimeString,
    fromDate: DateTimeString,
    toDate: DateTimeString,
    createdBy: Schema.String,
  }),
});

export type LegacyReservationChanged = typeof LegacyReservationChanged.Encoded;

const GameCharacter = Schema.Struct({
  lvl: FiniteNumber,
  nick: NonEmptyString,
  accountId: NonEmptyString,
  characterId: NonEmptyString,
  prof: NonEmptyString,
  icon: NonEmptyString,
  clan: Schema.optionalKey(
    Schema.Struct({
      id: Schema.optionalKey(FiniteNumber),
      name: Schema.optionalKey(Schema.String),
    }),
  ),
});

/** `notification.sent`: the reported notification, for one Organization. */
export const NotificationSent = Schema.Struct({
  guildId: NonEmptyString,
  notificationId: NonEmptyString,
  discordId: NonEmptyString,
  createdAt: DateTimeString,
  world: NonEmptyString,
  message: Schema.optionalKey(Schema.String),
  npc: Schema.optionalKey(
    Schema.Struct({
      id: FiniteNumber,
      name: NonEmptyString,
      location: NonEmptyString,
      lvl: FiniteNumber,
      prof: Schema.optionalKey(Schema.String),
      wt: FiniteNumber,
      hpp: Schema.optionalKey(FiniteNumber),
      x: Schema.optionalKey(FiniteNumber),
      y: Schema.optionalKey(FiniteNumber),
      icon: NonEmptyString,
      // Classified by the API from the reported Margonem type number.
      type: NpcTypeSchema,
      isHeroFromEvent: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  isGatheringParty: Schema.optionalKey(Schema.Boolean),
  character: Schema.optionalKey(GameCharacter),
  heroTracker: Schema.optionalKey(
    Schema.Union([
      Schema.Struct({ state: Schema.Literal("unclaimed") }),
      Schema.Struct({
        state: Schema.Literal("open"),
        entranceClosesAt: DateTimeString,
      }),
    ]),
  ),
});

export type NotificationSent = typeof NotificationSent.Encoded;

/** `party-gathering.updated`: a gathering opened in one Organization. */
export const PartyGatheringOpened = Schema.Struct({
  notificationId: NonEmptyString,
  guildId: NonEmptyString,
  discordId: NonEmptyString,
  character: Schema.Struct({
    accountId: Schema.String,
    characterId: Schema.String,
    icon: Schema.String,
    lvl: FiniteNumber,
    nick: Schema.String,
    prof: Schema.String,
    clan: Schema.optionalKey(
      Schema.Struct({
        id: Schema.optionalKey(FiniteNumber),
        name: Schema.optionalKey(Schema.String),
      }),
    ),
  }),
  world: NonEmptyString,
  createdAt: DateTimeString,
  ...partyGatheringDetailsFields,
});

export type PartyGatheringOpened = typeof PartyGatheringOpened.Encoded;

/** `party-gathering.cancelled`. */
export const PartyGatheringCancelled = Schema.Struct({
  notificationId: NonEmptyString,
  guildId: NonEmptyString,
});

export type PartyGatheringCancelled = typeof PartyGatheringCancelled.Encoded;

/** `member-refresh.updated`: progress of a bulk member refresh. */
export const MemberRefreshJobUpdated = Schema.Struct({
  jobId: FiniteNumber,
  guildId: NonEmptyString,
  status: Schema.Literals(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  totalMembers: FiniteNumber,
  processedMembers: FiniteNumber,
  failedMembers: FiniteNumber,
  completedAt: Schema.NullOr(DateTimeString),
  // Member ids by outcome, on the update that completes the job.
  refreshedIds: Schema.optionalKey(Schema.Array(Schema.String)),
  skippedIds: Schema.optionalKey(Schema.Array(Schema.String)),
  failedIds: Schema.optionalKey(Schema.Array(Schema.String)),
});

export type MemberRefreshJobUpdated = typeof MemberRefreshJobUpdated.Encoded;
