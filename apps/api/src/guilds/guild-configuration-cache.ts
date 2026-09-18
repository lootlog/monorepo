import { Effect, Predicate } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import { getGuildCacheKey, GUILD_CACHE_TTL_SECONDS } from "#src/shared/cache";

interface GuildConfigurationCache {
  get: (key: string) => Effect.Effect<string | null, unknown>;
  del: (key: string) => Effect.Effect<void, unknown>;
  set: (
    key: string,
    value: string,
    ttl: number,
  ) => Effect.Effect<void, unknown>;
}

export const readGuildConfigurationCache = Effect.fnUntraced(function* (
  cache: GuildConfigurationCache,
  idOrVanityUrl: string,
) {
  const key = getGuildCacheKey(idOrVanityUrl);
  const cached = yield* cache.get(key);

  if (!cached) return null;

  try {
    const guild = decodeJsonUnknown(cached);

    if (!Predicate.isObject(guild) || Array.isArray(guild))
      throw new Error("Invalid guild cache");

    return { ...guild, ...resolveReservationSettings(guild) };
  } catch {
    yield* cache.del(key);

    return null;
  }
});

/**
 * Caches the guild under the looked-up key only. Deriving a second key from
 * `vanityUrl` would let one Organization's row occupy another's id key.
 */
export const writeGuildConfigurationCache = (
  cache: {
    set: (
      key: string,
      value: string,
      ttl: number,
    ) => Effect.Effect<unknown, unknown>;
  },
  idOrVanityUrl: string,
  guild: { id: string },
) =>
  cache.set(
    getGuildCacheKey(idOrVanityUrl),
    JSON.stringify(guild),
    GUILD_CACHE_TTL_SECONDS,
  );
