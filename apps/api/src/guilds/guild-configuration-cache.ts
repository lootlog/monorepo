import { Effect, Predicate, Schema } from "effect";
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

const isBoolean = Schema.is(Schema.Boolean);

export const decodeGuildConfigurationCache = (value: string) => {
  const guild = decodeJsonUnknown(value);
  if (
    !Predicate.isObject(guild) ||
    Array.isArray(guild) ||
    !isBoolean(guild.groupFightsEnabled) ||
    !isBoolean(guild.groupFightsIncludeIncomplete)
  ) {
    throw new Error("Invalid or outdated guild cache");
  }
  return { ...guild, ...resolveReservationSettings(guild) };
};

export const readGuildConfigurationCache = Effect.fnUntraced(function* (
  cache: GuildConfigurationCache,
  idOrVanityUrl: string,
) {
  const key = getGuildCacheKey(idOrVanityUrl);
  const cached = yield* cache.get(key);
  if (!cached) return null;
  try {
    return decodeGuildConfigurationCache(cached);
  } catch {
    yield* cache.del(key);
    return null;
  }
});

export const writeGuildConfigurationCache = (
  cache: GuildConfigurationCache,
  guild: { id: string; vanityUrl: string | null },
  concurrency?: "unbounded",
) => {
  const encoded = JSON.stringify(guild);
  return Effect.all(
    [
      cache.set(getGuildCacheKey(guild.id), encoded, GUILD_CACHE_TTL_SECONDS),
      ...(guild.vanityUrl
        ? [
            cache.set(
              getGuildCacheKey(guild.vanityUrl),
              encoded,
              GUILD_CACHE_TTL_SECONDS,
            ),
          ]
        : []),
    ],
    { concurrency },
  );
};
