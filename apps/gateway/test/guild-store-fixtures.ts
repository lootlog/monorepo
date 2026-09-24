import { mock } from "bun:test";
import { Schema } from "effect";
import { getUserGuildsCacheKey } from "../src/guilds/cache-keys.js";
import type { GetUserGuildsOptions } from "../src/guilds/guild.js";

const CacheRevisionJson = Schema.fromJsonString(
  Schema.Struct({
    revision: Schema.optional(Schema.String),
    invalidated: Schema.optional(Schema.Literal(true)),
    stale: Schema.optional(Schema.String),
  }),
);

// Redis is the external boundary; the Lua implementation is exercised against
// Dragonfly in realtime-redis.integration.test.ts.
export const makeGuildStoreRedis = (
  options: GetUserGuildsOptions,
  initialCache: string | null = null,
) => {
  const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);
  const values = new Map<string, string>();
  const invalidations: string[] = [];
  const commits: string[] = [];

  if (initialCache !== null) values.set(cacheKey, initialCache);

  const get = mock((key: string) => Promise.resolve(values.get(key) ?? null));

  const evaluate = mock(
    (
      _script: string,
      _numberOfKeys: number,
      ...args: ReadonlyArray<string | number>
    ) => {
      const [keyArgument, revisionArgument, valueOrTtl, ttl] = args;
      const key = String(keyArgument);
      const revision = String(revisionArgument);
      const current = values.get(key);

      const cached = current
        ? Schema.decodeUnknownSync(CacheRevisionJson)(current)
        : null;

      if (ttl === undefined) {
        values.set(
          key,
          JSON.stringify({
            stale: cached?.invalidated ? cached.stale : current,
            revision,
            invalidated: true,
          }),
        );
        invalidations.push(key);

        return Promise.resolve(1);
      }

      if ((cached?.revision ?? "") !== revision) return Promise.resolve(0);

      values.set(key, String(valueOrTtl));
      commits.push(key);

      return Promise.resolve(1);
    },
  );

  return {
    store: { command: { get, eval: evaluate } },
    cache: () => values.get(cacheKey) ?? null,
    get,
    evaluate,
    invalidations,
    commits,
  };
};
