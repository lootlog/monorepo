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

export const isAirTagRelation = (value: unknown): value is AirTagRelation =>
  typeof value === "number" &&
  AIR_TAG_RELATIONS.includes(value as AirTagRelation);

const isIntegerInRange = (value: unknown, minimum: number, maximum: number) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= minimum &&
  value <= maximum;

const isNonEmptyString = (value: unknown, maximumLength: number) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= maximumLength;

const isAirTagClan = (value: unknown): value is AirTagClan => {
  if (!value || typeof value !== "object") return false;

  const clan = value as Partial<AirTagClan>;
  return (
    isIntegerInRange(clan.id, 0, Number.MAX_SAFE_INTEGER) &&
    isNonEmptyString(clan.name, 64)
  );
};

export const isAirTagObservation = (
  value: unknown,
): value is AirTagObservation => {
  if (!value || typeof value !== "object") return false;

  const observation = value as Partial<AirTagObservation>;
  return (
    isNonEmptyString(observation.targetId, 64) &&
    isNonEmptyString(observation.nickname, 64) &&
    (observation.clan === undefined || isAirTagClan(observation.clan)) &&
    isAirTagRelation(observation.relation) &&
    isIntegerInRange(observation.x, 0, AIR_TAG_MAX_COORDINATE) &&
    isIntegerInRange(observation.y, 0, AIR_TAG_MAX_COORDINATE)
  );
};

export const isAirTagTarget = (value: unknown): value is AirTagTarget => {
  if (!isAirTagObservation(value)) return false;

  const target = value as AirTagTarget;
  return (
    isIntegerInRange(target.observedAt, 0, Number.MAX_SAFE_INTEGER) &&
    (target.enemyObservedAt === undefined ||
      isIntegerInRange(target.enemyObservedAt, 0, Number.MAX_SAFE_INTEGER)) &&
    (target.clanEnemyObservedAt === undefined ||
      isIntegerInRange(target.clanEnemyObservedAt, 0, Number.MAX_SAFE_INTEGER))
  );
};

const hasValidScopeIdentity = (value: {
  guildId?: unknown;
  world?: unknown;
  mapId?: unknown;
  epochId?: unknown;
  epochStartedAt?: unknown;
  revision?: unknown;
}) =>
  isNonEmptyString(value.guildId, 128) &&
  isNonEmptyString(value.world, 64) &&
  isIntegerInRange(value.mapId, 0, AIR_TAG_MAX_COORDINATE) &&
  isNonEmptyString(value.epochId, 64) &&
  isIntegerInRange(value.epochStartedAt, 0, Number.MAX_SAFE_INTEGER) &&
  isIntegerInRange(value.revision, 0, Number.MAX_SAFE_INTEGER);

export const isAirTagScopeSnapshot = (
  value: unknown,
): value is AirTagScopeSnapshot => {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<AirTagScopeSnapshot>;
  return (
    hasValidScopeIdentity(snapshot) &&
    Array.isArray(snapshot.targets) &&
    snapshot.targets.every(isAirTagTarget)
  );
};

export const isAirTagUpdateEvent = (
  value: unknown,
): value is AirTagUpdateEvent => {
  if (!value || typeof value !== "object") return false;

  const event = value as Partial<AirTagUpdateEvent>;
  return hasValidScopeIdentity(event) && isAirTagTarget(event.target);
};

export const getAirTagEffectiveRelation = (
  target: Pick<
    AirTagTarget,
    "relation" | "enemyObservedAt" | "clanEnemyObservedAt"
  >,
  now: number,
  ttlMs: number,
): AirTagRelation => {
  if (
    target.clanEnemyObservedAt !== undefined &&
    now - target.clanEnemyObservedAt < ttlMs
  ) {
    return AIR_TAG_CLAN_ENEMY_RELATION;
  }

  if (
    target.enemyObservedAt !== undefined &&
    now - target.enemyObservedAt < ttlMs
  ) {
    return AIR_TAG_ENEMY_RELATION;
  }

  return target.relation;
};
