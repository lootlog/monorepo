import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

/** An NPC this light can have a timer, so only these are reported as standing. */
export const NPC_PRESENCE_MIN_WT = 20;

export const NPC_PRESENCE_MAX_NPCS = 50;

export const NPC_PRESENCE_MAX_ORGANIZATIONS = 20;

/**
 * A reported NPC stops standing this long after its reporter's last heartbeat.
 * Only a reporter that vanished without closing its socket reaches it.
 */
export const NPC_PRESENCE_TTL_MS = 60_000;

/** The fields organization NPC visibility needs, keyed by the NPC's runtime id. */
export const NpcPresenceNpcSchema = Schema.Struct({
  id: NonNegativeInt,
  lvl: NonNegativeInt,
  wt: NonNegativeInt,
  prof: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(8))),
  type: Schema.optionalKey(NonNegativeInt),
});

export type NpcPresenceNpc = typeof NpcPresenceNpcSchema.Type;

/** Every NPC a character currently sees on its map; each report replaces the previous one. */
export const NpcPresenceReportSchema = Schema.Struct({
  world: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
  organizationIds: Schema.Array(Schema.NonEmptyString).check(
    Schema.isMaxLength(NPC_PRESENCE_MAX_ORGANIZATIONS),
  ),
  npcs: Schema.Array(NpcPresenceNpcSchema).check(
    Schema.isMaxLength(NPC_PRESENCE_MAX_NPCS),
  ),
});

export type NpcPresenceReport = typeof NpcPresenceReportSchema.Type;

/** Sent only when an NPC gains its first reporter or loses its last one. */
export const NpcPresenceEventSchema = Schema.Struct({
  organizationId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  /** Orders the updates of one Organization and world across gateway replicas. */
  revision: NonNegativeInt,
  npc: NpcPresenceNpcSchema,
  standing: Schema.Boolean,
  /** Gateway time the NPC was first reported. */
  since: NonNegativeInt,
});

export type NpcPresenceEvent = typeof NpcPresenceEventSchema.Type;

export const NpcPresenceSnapshotSchema = Schema.Struct({
  revision: NonNegativeInt,
  npcs: Schema.Array(
    Schema.Struct({ npc: NpcPresenceNpcSchema, since: NonNegativeInt }),
  ),
});

export type NpcPresenceSnapshot = typeof NpcPresenceSnapshotSchema.Type;

export const NpcPresenceRejectCode = Schema.Literals([
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
