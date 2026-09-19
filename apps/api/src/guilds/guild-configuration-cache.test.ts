import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  getGuildCacheKey,
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

  it("never lets an Organization whose vanity URL equals another Organization's id occupy or answer for that id", async () => {
    const cache = memoryCache();
    const victimId = "123456789012345678";

    const hijacker = {
      id: "987654321098765432",
      vanityUrl: victimId,
      name: "Hijacker",
      active: true,
    };

    await Effect.runPromise(
      writeGuildConfigurationCache(cache, hijacker.id, hijacker),
    );
    expect([...cache.values.keys()]).toEqual([getGuildCacheKey(hijacker.id)]);
    expect(
      await Effect.runPromise(readGuildConfigurationCache(cache, victimId)),
    ).toBeNull();

    // A poisoned entry, however it got there, is evicted instead of served.
    cache.values.set(getGuildCacheKey(victimId), JSON.stringify(hijacker));
    expect(
      await Effect.runPromise(readGuildConfigurationCache(cache, victimId)),
    ).toBeNull();
    expect(cache.deleted).toEqual([getGuildCacheKey(victimId)]);
  });

  it("serves a vanity lookup from its own namespace while preserving all fields", async () => {
    const cache = memoryCache();

    const guild = {
      id: "123456789012345678",
      vanityUrl: "vanity",
      name: "Group",
      active: true,
    };

    await Effect.runPromise(
      writeGuildConfigurationCache(cache, "vanity", guild),
    );
    expect(getGuildCacheKey("vanity")).not.toBe(getGuildCacheKey(guild.id));
    expect(
      await Effect.runPromise(readGuildConfigurationCache(cache, "vanity")),
    ).toMatchObject(guild);
    expect(
      await Effect.runPromise(readGuildConfigurationCache(cache, guild.id)),
    ).toBeNull();
  });
});
