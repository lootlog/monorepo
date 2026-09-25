import { mock } from "bun:test";
import { Schema } from "effect";
import { getUserGuildsCacheKey } from "../src/guilds/cache-keys.js";
import type { GetUserGuildsOptions } from "../src/guilds/guild.js";

const CacheRevisionJson = Schema.fromJsonString(
  Schema.Struct({ revision: Schema.optional(Schema.String) }),
);

// Redis is the external boundary; the revision-checked commit script is
// exercised against Dragonfly in realtime-redis.integration.test.ts.
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

  const set = mock((key: string, value: string) => {
    values.set(key, value);
    invalidations.push(key);

    return Promise.resolve("OK" as const);
  });

  const evaluate = mock(
    (
      _script: string,
      _numberOfKeys: number,
      ...args: ReadonlyArray<string | number>
    ) => {
      const [keyArgument, revisionArgument, value] = args;
      const key = String(keyArgument);
      const current = values.get(key);

      const revision = current
        ? Schema.decodeUnknownSync(CacheRevisionJson)(current).revision
        : undefined;

      if ((revision ?? "") !== String(revisionArgument))
        return Promise.resolve(0);

      values.set(key, String(value));
      commits.push(key);

      return Promise.resolve(1);
    },
  );

  return {
    store: { command: { get, set, eval: evaluate } },
    cache: () => values.get(cacheKey) ?? null,
    get,
    set,
    evaluate,
    invalidations,
    commits,
  };
};
