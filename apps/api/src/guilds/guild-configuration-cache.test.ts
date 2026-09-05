import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { getGuildCacheKey } from "#src/shared/cache";
import {
  readGuildConfigurationCache,
  writeGuildConfigurationCache,
} from "./guild-configuration-cache.js";

const memoryCache = () => {
  const values = new Map<string, string>();
  const deleted: string[] = [];
  return {
    values,
    deleted,
    get: (key: string) => Effect.sync(() => values.get(key) ?? null),
    set: (key: string, value: string, _ttl: number) =>
      Effect.sync(() => {
        values.set(key, value);
      }),
    del: (key: string) =>
      Effect.sync(() => {
        deleted.push(key);
        values.delete(key);
      }),
  };
};

describe("guild configuration cache", () => {
  it("evicts malformed JSON and array entries so callers can load authoritative data", async () => {
    await Promise.all(
      ["{broken", "[]", "null"].map(async (invalid) => {
        const cache = memoryCache();
        cache.values.set(getGuildCacheKey("guild"), invalid);
        expect(
          await Effect.runPromise(readGuildConfigurationCache(cache, "guild")),
        ).toBeNull();
        expect(cache.deleted).toEqual([getGuildCacheKey("guild")]);
      }),
    );
  });

  it("writes the same guild snapshot under ID and vanity while preserving all fields", async () => {
    const cache = memoryCache();
    const guild = {
      id: "guild",
      vanityUrl: "vanity",
      name: "Group",
      active: true,
    };
    await Effect.runPromise(
      writeGuildConfigurationCache(cache, guild, "unbounded"),
    );
    expect(cache.values.get(getGuildCacheKey("guild"))).toBe(
      JSON.stringify(guild),
    );
    expect(cache.values.get(getGuildCacheKey("vanity"))).toBe(
      JSON.stringify(guild),
    );
    expect(
      await Effect.runPromise(readGuildConfigurationCache(cache, "vanity")),
    ).toMatchObject(guild);
  });
});
