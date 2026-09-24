import { Effect, Predicate } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import { isOrganizationIdLike } from "@lootlog/domain/organization-vanity-url";

const GUILD_CACHE_TTL_SECONDS = 3600;

// v2: v1 (`guild:<id or vanity URL>`) kept ids and vanity URLs in one namespace
// and wrote every row under a key derived from its vanity URL, so a vanity URL
// equal to another Organization's id overwrote that Organization's entry. The
// new prefix leaves every v1 entry unread.
const GUILD_CACHE_KEY_PREFIX = "guild-lookup:v2";

/**
 * Cache key for a guild looked up by `idOrVanityUrl`. Ids and vanity URLs live
 * in separate namespaces, and an id-like value only ever maps to the id
 * namespace, so no vanity URL can address another Organization's id entry.
 */
export const getGuildCacheKey = (idOrVanityUrl: string) =>
  `${GUILD_CACHE_KEY_PREFIX}:${
    isOrganizationIdLike(idOrVanityUrl) ? "id" : "vanity"
  }:${idOrVanityUrl}`;

interface GuildConfigurationCache {
  get: (key: string) => Effect.Effect<string | null, unknown>;
  del: (key: string) => Effect.Effect<unknown, unknown>;
  set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<unknown, unknown>;
}

const decodeGuildObject = (cached: string) => {
  const guild = decodeJsonUnknown(cached);

  if (!Predicate.isObject(guild) || Array.isArray(guild))
    throw new Error("Invalid guild cache");

  return guild;
};

/**
 * Reads the guild cached for `idOrVanityUrl`. An entry that fails to decode,
 * or that sits under an id key while describing a different Organization, is
 * evicted so the caller loads authoritative data.
 */
export const readCachedGuild = Effect.fnUntraced(function* <Guild>(
  cache: Pick<GuildConfigurationCache, "get" | "del">,
  idOrVanityUrl: string,
  decode: (cached: string) => Guild,
) {
  const key = getGuildCacheKey(idOrVanityUrl);
  const cached = yield* cache.get(key);

  if (!cached) return null;

  try {
    const guild = decode(cached);

    if (
      isOrganizationIdLike(idOrVanityUrl) &&
      (!Predicate.hasProperty(guild, "id") || guild.id !== idOrVanityUrl)
    )
      throw new Error("Guild cache entry belongs to another Organization");

    return guild;
  } catch {
    yield* cache.del(key);

    return null;
  }
});

export const readGuildConfigurationCache = (
  cache: Pick<GuildConfigurationCache, "get" | "del">,
  idOrVanityUrl: string,
) =>
  readCachedGuild(cache, idOrVanityUrl, decodeGuildObject).pipe(
    Effect.map(
      (guild) => guild && { ...guild, ...resolveReservationSettings(guild) },
    ),
  );

/**
 * Caches the guild under the looked-up key only. Deriving a second key from
 * the row's `vanityUrl` would let one Organization write another's entry.
 */
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
