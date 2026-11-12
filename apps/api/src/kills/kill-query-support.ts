import { buildLootVisibilityCacheRoles } from "#src/loots/loot-visibility-cache";
import { Capability, type AccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { stableJsonCacheKey } from "@lootlog/schema/stable-json";
import { Effect, Schema } from "effect";
import type { roleTable } from "#src/database/drizzle/organization.schema";
import type { ApplicationLogger } from "#src/shared/application-logger";
import type { StaleJson } from "#src/redis/stale-json-cache";
import type { KillStatsFilter } from "./kill-stats-persistence.js";

export type KillQueryRole = typeof roleTable.$inferSelect;

export interface KillQueryCache {
  readonly getOrSet: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
    ttlSeconds: number,
    scopes: readonly string[],
  ) => Effect.Effect<S["Type"], unknown>;
}

export interface StaleKillQueryCache {
  /** Serves the value for hours past `freshSeconds` while it refreshes. */
  readonly getOrSetStale: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
    freshSeconds: number,
  ) => Effect.Effect<StaleJson<S["Type"]>, unknown>;
}

export const buildKillQueryCacheKey = <Params extends object>(
  scope: string,
  ownerId: string,
  params: Params,
) => `kill-stats:${scope}:${ownerId}:${stableJsonCacheKey(params)}`;

export const buildNpcLevelFilter = (
  npcLevelMin?: number,
  npcLevelMax?: number,
) => {
  const normalizedMin =
    npcLevelMin && npcLevelMin > 0 ? npcLevelMin : undefined;

  const normalizedMax =
    npcLevelMax && npcLevelMax > 0 ? npcLevelMax : undefined;

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
  // Kills reveal the same NPCs as their loots, so only the recovery authority
  // bypasses role coverage, as in `canViewLoot`.
  if (accessPolicy.allows(Capability.OWNER)) return {};

  if (roles.length === 0) return { npcType: { in: [] } };

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
  accessPolicy.allows(Capability.OWNER)
    ? { administrativeUser: true }
    : {
        visibilityVersion: 2,
        administrativeUser: false,
        roles: buildLootVisibilityCacheRoles(roles),
      };

export const cachedKillQuery = <
  S extends Schema.ConstraintDecoder<unknown>,
>(options: {
  readonly cache: KillQueryCache;
  readonly logger: ApplicationLogger;
  readonly key: string;
  readonly scopes: readonly string[];
  readonly label: string;
  readonly schema: S;
  readonly load: Effect.Effect<S["Type"], unknown>;
}) =>
  options.cache.getOrSet(
    options.key,
    options.schema,
    options.load,
    30,
    options.scopes,
  );

/**
 * Organization kill statistics scan the Organization's whole history, so they
 * are served for `FRESH_SECONDS` and refreshed in the background; kills do not
 * invalidate them.
 */
export const GUILD_KILL_STATS_FRESH_SECONDS = 3_600;

export const cachedStaleKillQuery = <
  S extends Schema.ConstraintDecoder<unknown>,
>(options: {
  readonly cache: StaleKillQueryCache;
  readonly key: string;
  readonly schema: S;
  readonly load: Effect.Effect<S["Type"], unknown>;
}) =>
  options.cache.getOrSetStale(
    options.key,
    options.schema,
    options.load,
    GUILD_KILL_STATS_FRESH_SECONDS,
  );
