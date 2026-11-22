import { Effect, Predicate } from "effect";
import { DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES } from "@lootlog/domain/loot-draw";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import type { RedisError } from "effect/persistence/Redis";
import { isOrganizationIdLike } from "@lootlog/domain/organization-vanity-url";

const GUILD_CACHE_TTL_SECONDS = 3600;

const GUILD_CACHE_KEY_PREFIX = "guild-lookup:v2";

export const getGuildCacheKey = (idOrVanityUrl: string) =>
  `${GUILD_CACHE_KEY_PREFIX}:${
    isOrganizationIdLike(idOrVanityUrl) ? "id" : "vanity"
  }:${idOrVanityUrl}`;

export interface GuildConfigurationCache {
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly del: (key: string) => Effect.Effect<void, RedisError>;
  readonly set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<void, RedisError>;
}

const decodeGuildObject = (cached: string) => {
  const guild = decodeJsonUnknown(cached);

  if (!Predicate.isObject(guild) || Array.isArray(guild))
    throw new Error("Invalid guild cache");

  return guild;
};

export const readCachedGuild = Effect.fnUntraced(function* <Guild>(
  cache: Pick<GuildConfigurationCache, "get" | "del">,
  idOrVanityUrl: string,
  decode: (cached: string) => Guild,
) {
  const key = getGuildCacheKey(idOrVanityUrl);
  const cached = yield* cache.get(key);

  if (!cached) return null;

  return yield* Effect.try(() => {
    const guild = decode(cached);

    if (
      isOrganizationIdLike(idOrVanityUrl) &&
      (!Predicate.hasProperty(guild, "id") || guild.id !== idOrVanityUrl)
    )
      throw new Error("Guild cache entry belongs to another Organization");

    return guild;
  }).pipe(Effect.catch(() => Effect.as(cache.del(key), null)));
});

export const readGuildConfigurationCache = (
  cache: Pick<GuildConfigurationCache, "get" | "del">,
  idOrVanityUrl: string,
) =>
  readCachedGuild(cache, idOrVanityUrl, decodeGuildObject).pipe(
    Effect.map(
      (guild) =>
        guild && {
          lootDrawExcludedNpcTypes: [...DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES],
          ...guild,
          ...resolveReservationSettings(guild),
        },
    ),
  );

export const writeGuildConfigurationCache = (
  cache: Pick<GuildConfigurationCache, "set">,
  idOrVanityUrl: string,
  guild: { readonly id: string },
) =>
  cache.set(
    getGuildCacheKey(idOrVanityUrl),
    JSON.stringify(guild),
    GUILD_CACHE_TTL_SECONDS,
  );
