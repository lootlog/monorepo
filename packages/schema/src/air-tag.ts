import { Schema } from "effect";

export const AIR_TAG_RELATIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const AIR_TAG_ENEMY_RELATION = 3;
export const AIR_TAG_CLAN_ENEMY_RELATION = 6;
export const AIR_TAG_MAX_BATCH_SIZE = 50;
export const AIR_TAG_MAX_COORDINATE = 65_535;

export type AirTagRelation = (typeof AIR_TAG_RELATIONS)[number];

export interface AirTagClan {
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
}

export interface AirTagObservationBatch {
  expectedMapId: number;
  observations: AirTagObservation[];
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

export const AirTagRelationSchema = Schema.Literals(AIR_TAG_RELATIONS);
export const AirTagClanSchema = Schema.Struct({
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
});
export const AirTagObservationBatchSchema = Schema.Struct({
  expectedMapId: Coordinate,
  observations: Schema.Array(AirTagObservationSchema),
});
export const AirTagSubscriptionPayloadSchema = Schema.Struct({
  requestId: ShortString,
  enabled: Schema.Boolean,
  expectedMapId: Schema.optionalKey(Coordinate),
});
export const AirTagTargetSchema = Schema.Struct({
  targetId: ShortString,
  nickname: ShortString,
  clan: Schema.optionalKey(AirTagClanSchema),
  relation: AirTagRelationSchema,
  x: Coordinate,
  y: Coordinate,
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
});
export const AirTagUpdateEventSchema = Schema.Struct({
  ...AirTagScopeIdentityFields,
  target: AirTagTargetSchema,
});

export const isAirTagRelation = Schema.is(AirTagRelationSchema);
export const isAirTagObservation = Schema.is(AirTagObservationSchema);
export const isAirTagTarget = Schema.is(AirTagTargetSchema);
export const isAirTagScopeSnapshot = Schema.is(AirTagScopeSnapshotSchema);
export const isAirTagUpdateEvent = Schema.is(AirTagUpdateEventSchema);
