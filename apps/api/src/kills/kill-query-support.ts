import { Capability, type AccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Schema } from "effect";
import type { roleTable } from "#src/database/drizzle/schema";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { KillStatsFilter } from "./kill-stats-persistence.js";

export type KillQueryRole = typeof roleTable.$inferSelect;

export interface KillQueryCache {
  readonly get: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
  ) => Effect.Effect<S["Type"] | null, unknown>;
  readonly set: <A>(
    key: string,
    value: A,
    ttlSeconds: number,
  ) => Effect.Effect<void, unknown>;
}

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const buildKillQueryCacheKey = (
  scope: string,
  ownerId: string,
  params: Record<string, unknown>,
) =>
  `kill-stats:${scope}:${ownerId}:${Buffer.from(stableSerialize(params)).toString("base64url")}`;

export const buildNpcLevelFilter = (minLvl?: number, maxLvl?: number) => {
  const normalizedMin = minLvl && minLvl > 0 ? minLvl : undefined;
  const normalizedMax = maxLvl && maxLvl > 0 ? maxLvl : undefined;
  return normalizedMin === undefined && normalizedMax === undefined
    ? {}
    : {
        npcLvl: {
          ...(normalizedMin !== undefined && { gte: normalizedMin }),
          ...(normalizedMax !== undefined && { lte: normalizedMax }),
        },
      };
};

export const readableRoles = (roles: ReadonlyArray<KillQueryRole>) =>
  roles.filter((role) =>
    role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
  );

export const visibilityFilter = (
  accessPolicy: AccessPolicy,
  roles: ReadonlyArray<KillQueryRole>,
): KillStatsFilter => {
  if (accessPolicy.allows(Capability.ADMIN) || roles.length === 0) return {};

  return {
    OR: roles.map((role) => ({
      AND: [
        { npcLvl: { gte: Number(role.lvlRangeFrom ?? 0) } },
        { npcLvl: { lte: Number(role.lvlRangeTo ?? 500) } },
        ...(!role.permissions.includes(Permission.LOOTLOG_LOOTS_TITANS_READ)
          ? [{ npcType: { not: NpcType.TITAN } } as const]
          : []),
        ...(!role.permissions.includes(Permission.LOOTLOG_LOOTS_HEROES_READ)
          ? [
              {
                npcType: { notIn: [NpcType.HERO, NpcType.EVENT_HERO] },
              } as const,
            ]
          : []),
      ],
    })),
  };
};

export const visibilityCacheScope = (
  accessPolicy: AccessPolicy,
  roles: ReadonlyArray<KillQueryRole>,
) =>
  accessPolicy.allows(Capability.ADMIN)
    ? { administrativeUser: true }
    : {
        administrativeUser: false,
        roles: roles
          .map((role) => ({
            id: role.id,
            lvlRangeFrom: role.lvlRangeFrom,
            lvlRangeTo: role.lvlRangeTo,
            permissions: [...role.permissions].sort(),
          }))
          .sort((left, right) => left.id.localeCompare(right.id)),
      };

export const cachedKillQuery = <
  S extends Schema.ConstraintDecoder<unknown>,
>(options: {
  readonly cache: KillQueryCache;
  readonly logger: ApplicationLogger;
  readonly key: string;
  readonly label: string;
  readonly schema: S;
  readonly load: Effect.Effect<S["Type"], unknown>;
}) =>
  Effect.gen(function* () {
    const existing = yield* options.cache.get(options.key, options.schema);
    if (existing !== null) {
      options.logger.log({
        level: "debug",
        message: `Cache hit for ${options.label}`,
        cacheKey: options.key,
      });
      return existing;
    }
    options.logger.log({
      level: "debug",
      message: `Cache miss for ${options.label}`,
      cacheKey: options.key,
    });
    const value = yield* options.load;
    yield* options.cache.set(options.key, value, 30);
    return value;
  });
