import { Schema } from "effect";

const AIR_TAG_RELATIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const AIR_TAG_ENEMY_RELATION = 3;

export const AIR_TAG_CLAN_ENEMY_RELATION = 6;

export const AIR_TAG_MAX_BATCH_SIZE = 50;

const AIR_TAG_MAX_COORDINATE = 65_535;

export const AIR_TAG_MAX_MAP_NAME_LENGTH = 128;

/** A map threat is current this long after its last clan-enemy sighting. */
export const AIR_TAG_MAP_THREAT_FRESH_MS = 10_000;

/** After this long without a sighting, a map threat is dropped. */
export const AIR_TAG_MAP_THREAT_TTL_MS = 30_000;

export type AirTagRelation = (typeof AIR_TAG_RELATIONS)[number];

interface AirTagClan {
  id: number;
  name: string;
}

export interface AirTagObservation {
  targetId: string;
  nickname: string;
  clan?: AirTagClan;
  relation: AirTagRelation;
  x: number;
  y: number;
  lvl?: number;
  /** Margonem stasis: the player is away from the keyboard. */
  stasis?: boolean;
}

/**
 * `left-map`: the observer is certain the target left the map (logout, teleport,
 * gateway). `out-of-sight`: the target may still be on the map, beyond the
 * observer's war shadow range.
 */
export type AirTagDepartureReason = "left-map" | "out-of-sight";

export interface AirTagDeparture {
  targetId: string;
  reason: AirTagDepartureReason;
}

export interface AirTagObservationBatch {
  expectedMapId: number;
  observations: AirTagObservation[];
  /** Sent only to gateways listing `lootlog.air-tag-scope-update.v1`. */
  departures?: AirTagDeparture[];
}

export interface AirTagSubscriptionPayload {
  requestId: string;
  enabled: boolean;
  expectedMapId?: number;
}

export interface AirTagTarget extends AirTagObservation {
  observedAt: number;
  enemyObservedAt?: number;
  clanEnemyObservedAt?: number;
}

export interface AirTagScopeSnapshot {
  guildId: string;
  world: string;
  mapId: number;
  epochId: string;
  epochStartedAt: number;
  revision: number;
  targets: AirTagTarget[];
  /** Redis time of the snapshot; relates `observedAt` values to the local clock. */
  serverTime?: number;
}

export interface AirTagUpdateEvent {
  guildId: string;
  world: string;
  mapId: number;
  epochId: string;
  epochStartedAt: number;
  revision: number;
  target: AirTagTarget;
}

/**
 * Every change of one scope from one merged batch. Removals precede updates:
 * `targets[i]` carries revision `revision - (targets.length - 1 - i)`.
 */
export interface AirTagScopeUpdateEvent {
  guildId: string;
  world: string;
  mapId: number;
  epochId: string;
  epochStartedAt: number;
  revision: number;
  targets: readonly AirTagTarget[];
  /** Targets every observer lost sight of after one saw them leave the map. */
  removedTargetIds: readonly string[];
}

export interface AirTagMapThreatEnemy {
  targetId: string;
  nickname: string;
  clan?: AirTagClan;
  lvl?: number;
  stasis?: boolean;
  /** Time since the last clan-enemy sighting when the gateway sent the event; immune to client clock skew. */
  ageMs: number;
}

/** Every clan enemy an Organization member saw on one map within `AIR_TAG_MAP_THREAT_TTL_MS`. */
export interface AirTagMapThreatEvent {
  guildId: string;
  world: string;
  mapId: number;
  mapName: string;
  /** Redis time of the aggregation; a later list of the same map replaces an earlier one. */
  revision: number;
  enemies: readonly AirTagMapThreatEnemy[];
}

export type AirTagRejectCode =
  | "forbidden"
  | "invalid-context"
  | "invalid-payload"
  | "rate-limited"
  | "temporarily-unavailable";

export type AirTagSubscriptionAck =
  | {
      status: "accepted";
      requestId: string;
      scopes: AirTagScopeSnapshot[];
    }
  | {
      status: "rejected";
      requestId: string;
      code: AirTagRejectCode;
    };

export type AirTagObservationAck =
  | {
      status: "accepted";
      acceptedScopes: number;
      acceptedTargets: number;
    }
  | {
      status: "rejected";
      code: AirTagRejectCode;
      retryAfterMs?: number;
    };

const ShortString = Schema.NonEmptyString.check(Schema.isMaxLength(64));

const GuildId = Schema.NonEmptyString.check(Schema.isMaxLength(128));

const SafeNatural = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
);

const Coordinate = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: AIR_TAG_MAX_COORDINATE }),
);

const Level = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 10_000 }),
);

const AirTagRelationSchema = Schema.Literals(AIR_TAG_RELATIONS);

const AirTagClanSchema = Schema.Struct({
  id: SafeNatural,
  name: ShortString,
});

export const AirTagObservationSchema = Schema.Struct({
  targetId: ShortString,
  nickname: ShortString,
  clan: Schema.optionalKey(AirTagClanSchema),
  relation: AirTagRelationSchema,
  x: Coordinate,
  y: Coordinate,
  lvl: Schema.optionalKey(Level),
  stasis: Schema.optionalKey(Schema.Boolean),
});

export const AirTagDepartureSchema = Schema.Struct({
  targetId: ShortString,
  reason: Schema.Literals(["left-map", "out-of-sight"]),
});

export const AirTagObservationBatchSchema = Schema.Struct({
  expectedMapId: Coordinate,
  observations: Schema.Array(AirTagObservationSchema),
  departures: Schema.optionalKey(Schema.Array(AirTagDepartureSchema)),
});

export const AirTagTargetSchema = Schema.Struct({
  targetId: ShortString,
  nickname: ShortString,
  clan: Schema.optionalKey(AirTagClanSchema),
  relation: AirTagRelationSchema,
  x: Coordinate,
  y: Coordinate,
  lvl: Schema.optionalKey(Level),
  stasis: Schema.optionalKey(Schema.Boolean),
  observedAt: SafeNatural,
  enemyObservedAt: Schema.optionalKey(SafeNatural),
  clanEnemyObservedAt: Schema.optionalKey(SafeNatural),
});

const AirTagScopeIdentityFields = {
  guildId: GuildId,
  world: ShortString,
  mapId: Coordinate,
  epochId: ShortString,
  epochStartedAt: SafeNatural,
  revision: SafeNatural,
} as const;

export const AirTagScopeSnapshotSchema = Schema.Struct({
  ...AirTagScopeIdentityFields,
  targets: Schema.Array(AirTagTargetSchema),
  serverTime: Schema.optionalKey(SafeNatural),
});

export const AirTagUpdateEventSchema = Schema.Struct({
  ...AirTagScopeIdentityFields,
  target: AirTagTargetSchema,
});

export const AirTagScopeUpdateEventSchema = Schema.Struct({
  ...AirTagScopeIdentityFields,
  targets: Schema.Array(AirTagTargetSchema),
  removedTargetIds: Schema.Array(ShortString),
});

export const AirTagMapThreatEventSchema = Schema.Struct({
  guildId: GuildId,
  world: ShortString,
  mapId: Coordinate,
  mapName: Schema.NonEmptyString.check(
    Schema.isMaxLength(AIR_TAG_MAX_MAP_NAME_LENGTH),
  ),
  revision: SafeNatural,
  enemies: Schema.Array(
    Schema.Struct({
      targetId: ShortString,
      nickname: ShortString,
      clan: Schema.optionalKey(AirTagClanSchema),
      lvl: Schema.optionalKey(Level),
      stasis: Schema.optionalKey(Schema.Boolean),
      ageMs: SafeNatural,
    }),
  ),
});

export const isAirTagObservation = Schema.is(AirTagObservationSchema);

export const isAirTagRelation = Schema.is(AirTagRelationSchema);

export const isAirTagScopeSnapshot = Schema.is(AirTagScopeSnapshotSchema);

export const isAirTagUpdateEvent = Schema.is(AirTagUpdateEventSchema);

export const isAirTagScopeUpdateEvent = Schema.is(AirTagScopeUpdateEventSchema);

export const isAirTagDeparture = Schema.is(AirTagDepartureSchema);
