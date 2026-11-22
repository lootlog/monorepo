import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

export const NPC_PRESENCE_MIN_WT = 20;

export const NPC_PRESENCE_MAX_NPCS = 50;

const NPC_PRESENCE_MAX_ORGANIZATIONS = 20;

export const NPC_PRESENCE_TTL_MS = 60_000;

export const NpcPresenceNpcSchema = Schema.Struct({
  id: NonNegativeInt,
  lvl: NonNegativeInt,
  wt: NonNegativeInt,
  prof: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(8))),
  type: Schema.optionalKey(NonNegativeInt),
});

export type NpcPresenceNpc = typeof NpcPresenceNpcSchema.Type;

export const NPC_PRESENCE_MAP_MAX_LENGTH = 128;

const NpcPresenceMapSchema = Schema.NonEmptyString.check(
  Schema.isMaxLength(NPC_PRESENCE_MAP_MAX_LENGTH),
);

export const NpcPresenceReportSchema = Schema.Struct({
  world: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
  organizationIds: Schema.Array(Schema.NonEmptyString).check(
    Schema.isMaxLength(NPC_PRESENCE_MAX_ORGANIZATIONS),
  ),
  npcs: Schema.Array(NpcPresenceNpcSchema).check(
    Schema.isMaxLength(NPC_PRESENCE_MAX_NPCS),
  ),
  map: Schema.optionalKey(NpcPresenceMapSchema),
});

export type NpcPresenceReport = typeof NpcPresenceReportSchema.Type;

export const NpcPresenceEventSchema = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  revision: NonNegativeInt,
  npc: NpcPresenceNpcSchema,
  standing: Schema.Boolean,
  since: NonNegativeInt,
  map: Schema.optionalKey(NpcPresenceMapSchema),
});

export type NpcPresenceEvent = typeof NpcPresenceEventSchema.Type;

export const NpcPresenceSnapshotSchema = Schema.Struct({
  revision: NonNegativeInt,
  npcs: Schema.Array(
    Schema.Struct({
      npc: NpcPresenceNpcSchema,
      since: NonNegativeInt,
      map: Schema.optionalKey(NpcPresenceMapSchema),
    }),
  ),
});

export type NpcPresenceSnapshot = typeof NpcPresenceSnapshotSchema.Type;

const NpcPresenceRejectCode = Schema.Literals([
  "forbidden",
  "invalid-context",
  "invalid-payload",
  "rate-limited",
  "temporarily-unavailable",
]);

export const NpcPresenceReportAckSchema = Schema.Union([
  Schema.Struct({ status: Schema.Literal("accepted") }),
  Schema.Struct({
    status: Schema.Literal("rejected"),
    code: NpcPresenceRejectCode,
    retryAfterMs: Schema.optional(NonNegativeInt),
  }),
]);

export type NpcPresenceReportAck = typeof NpcPresenceReportAckSchema.Type;
