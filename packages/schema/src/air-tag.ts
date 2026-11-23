import { Schema } from "effect";

const AIR_TAG_RELATIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const AIR_TAG_CLAN_ENEMY_RELATION = 6;

export const isAirTagClanEnemy = (
  relation: AirTagRelation | undefined,
): boolean => relation === AIR_TAG_CLAN_ENEMY_RELATION;

export const AIR_TAG_MAX_BATCH_SIZE = 50;

export const AIR_TAG_REPORTER_LEASE_MS = 6_000;

export const AIR_TAG_STANDBY_TAKEOVER_MS = 7_000;

const AIR_TAG_MAX_COORDINATE = 65_535;

export const AIR_TAG_MAX_MAP_NAME_LENGTH = 128;

export const AIR_TAG_MAP_THREAT_FRESH_MS = 10_000;

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
  prof?: string;
  stasis?: boolean;
}

export type AirTagDepartureReason = "left-map" | "out-of-sight";

export interface AirTagDeparture {
  targetId: string;
  reason: AirTagDepartureReason;
}

export interface AirTagObservationBatch {
  expectedMapId: number;
  observations: AirTagObservation[];
  departures?: AirTagDeparture[];
}

export interface AirTagSubscriptionPayload {
  requestId: string;
  enabled: boolean;
  expectedMapId?: number;
}

export interface AirTagTarget extends AirTagObservation {
  observedAt: number;
}

export interface AirTagScopeSnapshot {
  guildId: string;
  world: string;
  mapId: number;
  epochId: string;
  epochStartedAt: number;
  revision: number;
  targets: AirTagTarget[];
  serverTime: number;
}

export interface AirTagScopeUpdateEvent {
  guildId: string;
  world: string;
  mapId: number;
  epochId: string;
  epochStartedAt: number;
  revision: number;
  targets: readonly AirTagTarget[];
  removedTargetIds: readonly string[];
  unreportedTargetIds?: readonly string[];
}

export interface AirTagMapThreatEnemy {
  targetId: string;
  nickname: string;
  clan?: AirTagClan;
  lvl?: number;
  prof?: string;
  stasis?: boolean;
  ageMs: number;
}

export interface AirTagMapThreatEvent {
  guildId: string;
  world: string;
  mapId: number;
  mapName: string;
  revision: number;
  enemies: readonly AirTagMapThreatEnemy[];
}

type AirTagRejectCode =
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
      standbyTargetIds?: string[];
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

const Profession = Schema.NonEmptyString.check(Schema.isMaxLength(1));

const AirTagRelationSchema = Schema.Literals(AIR_TAG_RELATIONS);

const AirTagClanSchema = Schema.Struct({
  id: SafeNatural,
  name: ShortString,
});

const AirTagObservationSchema = Schema.Struct({
  targetId: ShortString,
  nickname: ShortString,
  clan: Schema.optionalKey(AirTagClanSchema),
  relation: AirTagRelationSchema,
  x: Coordinate,
  y: Coordinate,
  lvl: Schema.optionalKey(Level),
  prof: Schema.optionalKey(Profession),
  stasis: Schema.optionalKey(Schema.Boolean),
});

const AirTagDepartureSchema = Schema.Struct({
  targetId: ShortString,
  reason: Schema.Literals(["left-map", "out-of-sight"]),
});

export const AirTagObservationBatchSchema = Schema.Struct({
  expectedMapId: Coordinate,
  observations: Schema.Array(AirTagObservationSchema),
  departures: Schema.optionalKey(Schema.Array(AirTagDepartureSchema)),
});

export const AirTagTargetSchema = Schema.Struct({
  ...AirTagObservationSchema.fields,
  observedAt: SafeNatural,
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
  serverTime: SafeNatural,
});

export const AirTagScopeUpdateEventSchema = Schema.Struct({
  ...AirTagScopeIdentityFields,
  targets: Schema.Array(AirTagTargetSchema),
  removedTargetIds: Schema.Array(ShortString),
  unreportedTargetIds: Schema.optionalKey(Schema.Array(ShortString)),
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
      targetId: AirTagObservationSchema.fields.targetId,
      nickname: AirTagObservationSchema.fields.nickname,
      clan: AirTagObservationSchema.fields.clan,
      lvl: AirTagObservationSchema.fields.lvl,
      prof: AirTagObservationSchema.fields.prof,
      stasis: AirTagObservationSchema.fields.stasis,
      ageMs: SafeNatural,
    }),
  ),
});

export const isAirTagObservation = Schema.is(AirTagObservationSchema);

export const isAirTagRelation = Schema.is(AirTagRelationSchema);

export const isAirTagScopeSnapshot = Schema.is(AirTagScopeSnapshotSchema);

export const isAirTagScopeUpdateEvent = Schema.is(AirTagScopeUpdateEventSchema);

export const isAirTagDeparture = Schema.is(AirTagDepartureSchema);
