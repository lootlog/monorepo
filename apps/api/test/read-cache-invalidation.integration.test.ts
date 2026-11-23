import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { RedisService } from "#src/redis/redis.service";
import { makeReadCacheFixture } from "./read-cache-fixtures.js";

const fixture = makeReadCacheFixture();

const { codec, fromPromise, pttl, pexpire, write, read } = fixture;

let cache: RedisService;

describe("Read cache Dragonfly invalidation", () => {
  beforeAll(async () => {
    cache = await fixture.connect();
  });

  afterAll(fixture.close);

  it("expires idle generations and renews existing generations without evicting cached data", async () => {
    const entry = { key: "ttl:payload", scopes: ["ttl:scope"] };
    const generationKey = "cache-generation:v1:ttl:scope";

    await write(entry, 1);
    expect(await pttl(generationKey)).toBeGreaterThan(0);
    expect(await pttl(generationKey)).toBeLessThanOrEqual(3_600_000);
    const generation = await Effect.runPromise(cache.get(generationKey));

    if (generation === null) throw new Error("Missing generation");

    await Effect.runPromise(cache.set(generationKey, generation));
    expect(await pttl(generationKey)).toBe(-1);
    expect(await read(entry)).toEqual({ value: 1 });
    expect(await Effect.runPromise(cache.get(generationKey))).toBe(generation);
    expect(await pttl(generationKey)).toBeGreaterThan(3_500_000);

    await pexpire(generationKey, 10_000);
    expect(await read(entry)).toEqual({ value: 1 });
    expect(await pttl(generationKey)).toBeGreaterThan(3_500_000);

    await Effect.runPromise(cache.invalidateScopes(...entry.scopes));
    expect(await pttl(generationKey)).toBeGreaterThan(0);
    expect(await pttl(generationKey)).toBeLessThanOrEqual(3_600_000);
    expect(await Effect.runPromise(cache.get(generationKey))).not.toBe(
      generation,
    );
    expect(await read(entry)).toBeNull();

    await Effect.runPromise(cache.invalidateScopes("ttl:unread"));
    expect(await pttl("cache-generation:v1:ttl:unread")).toBeGreaterThan(0);
  });

  it("does not revive an old fill when its generation expires during loading", async () => {
    const entry = { key: "expiry:payload", scopes: ["expiry:scope"] };
    const generationKey = "cache-generation:v1:expiry:scope";
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const stale = Effect.runPromise(
      cache.getOrSetJson({
        ...entry,
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;
    const generation = await Effect.runPromise(cache.get(generationKey));

    try {
      await pexpire(generationKey, 0);
      expect(await Effect.runPromise(cache.get(generationKey))).toBeNull();
      expect(await write(entry, 2)).toEqual({ value: 2 });
      expect(await Effect.runPromise(cache.get(generationKey))).not.toBe(
        generation,
      );
    } finally {
      finish.resolve();
    }

    expect(await stale).toEqual({ value: 1 });
    expect(await read(entry)).toEqual({ value: 2 });
  });

  it("invalidates every user/world variant while preserving another organization", async () => {
    const keys = [
      { key: "timer:list:one:user:world", scopes: ["timer:list:one"] },
      { key: "timer:list:one:other:all", scopes: ["timer:list:one"] },
      { key: "timer:list:two:user:world", scopes: ["timer:list:two"] },
    ] as const;

    await Promise.all(keys.map((key) => write(key, 1)));
    await Effect.runPromise(cache.invalidateScopes("timer:list:one"));
    expect(await read(keys[0])).toBeNull();
    expect(await read(keys[1])).toBeNull();
    expect(await read(keys[2])).toEqual({ value: 1 });
    await write(keys[0], 2);
    await Effect.runPromise(cache.invalidateScopes("timer:list:one"));
    expect(await read(keys[0])).toBeNull();
  });

  it("invalidates an event independently and also supports organization-wide invalidation", async () => {
    const first = {
      key: "event-read:v2:one:first:details:e30",
      scopes: ["event-read:v2:one", "event-read:v2:one:first"],
    };

    const second = {
      key: "event-read:v2:one:second:details:e30",
      scopes: ["event-read:v2:one", "event-read:v2:one:second"],
    };

    const other = {
      key: "event-read:v2:two:first:details:e30",
      scopes: ["event-read:v2:two", "event-read:v2:two:first"],
    };

    await Promise.all([first, second, other].map((key) => write(key, 1)));
    await Effect.runPromise(cache.invalidateScopes("event-read:v2:one:first"));
    expect(await read(first)).toBeNull();
    expect(await read(second)).toEqual({ value: 1 });
    await Effect.runPromise(cache.invalidateScopes("event-read:v2:one"));
    expect(await read(second)).toBeNull();
    expect(await read(other)).toEqual({ value: 1 });
  });

  it("invalidates kill ranking variants without crossing the owner boundary", async () => {
    const overview = {
      key: "kill-stats:guild-overview:one:filters",
      scopes: ["kill-stats:guild:one"],
    };

    const member = {
      key: "kill-stats:member-kills:one:filters",
      scopes: ["kill-stats:guild:one"],
    };

    const other = {
      key: "kill-stats:guild-overview:two:filters",
      scopes: ["kill-stats:guild:two"],
    };

    const user = {
      key: "kill-stats:user-overview:one:filters",
      scopes: ["kill-stats:user:one"],
    };

    await Promise.all(
      [overview, member, other, user].map((key) => write(key, 1)),
    );
    await Effect.runPromise(cache.invalidateScopes("kill-stats:guild:one"));
    expect(await read(overview)).toBeNull();
    expect(await read(member)).toBeNull();
    expect(await read(other)).toEqual({ value: 1 });
    expect(await read(user)).toEqual({ value: 1 });
    await Effect.runPromise(cache.invalidateScopes("kill-stats:user:one"));
    expect(await read(user)).toBeNull();
  });

  it("never republishes a cache fill started before invalidation", async () => {
    const key = {
      key: "timer:list:race:user:world",
      scopes: ["timer:list:race"],
    };

    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const stale = Effect.runPromise(
      cache.getOrSetJson({
        ...key,
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;
    await Effect.runPromise(cache.invalidateScopes("timer:list:race"));
    expect(await write(key, 2)).toEqual({ value: 2 });
    finish.resolve();
    expect(await stale).toEqual({ value: 1 });
    expect(await read(key)).toEqual({ value: 2 });
  });

  it("invalidates member variants without evicting another organization", async () => {
    const keys = [
      {
        key: "member-read:members-one:references:active",
        scopes: ["member-read:members-one"],
      },
      {
        key: "member-read:members-one:references:all",
        scopes: ["member-read:members-one"],
      },
      {
        key: "member-read:members-one:summary",
        scopes: ["member-read:members-one"],
      },
      {
        key: "member-read:members-one:lootlog-config:member-one",
        scopes: ["member-read:members-one", "user-lootlog-config:member-one"],
      },
      {
        key: "member-read:members-two:summary",
        scopes: ["member-read:members-two"],
      },
    ];

    await Promise.all(keys.map((key) => write(key, 1)));
    await Effect.runPromise(cache.invalidateScopes("member-read:members-one"));

    for (const key of keys.slice(0, -1)) expect(await read(key)).toBeNull();
    expect(
      await read({
        key: "member-read:members-two:summary",
        scopes: ["member-read:members-two"],
      }),
    ).toEqual({ value: 1 });
  });

  it("refreshes all account and organization summary variants after settings invalidation", async () => {
    const affected = [
      {
        key: "user-lootlog-config:settings-user:account:one",
        scopes: ["user-lootlog-config:settings-user"],
      },
      {
        key: "user-lootlog-config:settings-user:account:two",
        scopes: ["user-lootlog-config:settings-user"],
      },
      {
        key: "member-read:settings-one:lootlog-config:settings-user",
        scopes: [
          "member-read:settings-one",
          "user-lootlog-config:settings-user",
        ],
      },
      {
        key: "member-read:settings-two:lootlog-config:settings-user",
        scopes: [
          "member-read:settings-two",
          "user-lootlog-config:settings-user",
        ],
      },
    ];

    const unaffected = [
      {
        key: "user-lootlog-config:other-user:account:one",
        scopes: ["user-lootlog-config:other-user"],
      },
      {
        key: "member-read:settings-one:lootlog-config:other-user",
        scopes: ["member-read:settings-one", "user-lootlog-config:other-user"],
      },
      {
        key: "member-read:settings-one:summary",
        scopes: ["member-read:settings-one"],
      },
    ];

    await Promise.all([...affected, ...unaffected].map((key) => write(key, 1)));
    await Effect.runPromise(
      cache.invalidateScopes("user-lootlog-config:settings-user"),
    );

    for (const key of affected) expect(await read(key)).toBeNull();

    for (const key of unaffected) expect(await read(key)).toEqual({ value: 1 });
  });

  it.each([
    [
      {
        key: "member-read:member-race:summary",
        scopes: ["member-read:member-race"],
      },
      "member-read:member-race",
    ],
    [
      {
        key: "user-lootlog-config:user-race:account:one",
        scopes: ["user-lootlog-config:user-race"],
      },
      "user-lootlog-config:user-race",
    ],
    [
      {
        key: "member-read:summary-race:lootlog-config:summary-user",
        scopes: [
          "member-read:summary-race",
          "user-lootlog-config:summary-user",
        ],
      },
      "user-lootlog-config:summary-user",
    ],
  ])(
    "keeps invalidated in-flight fills unreachable for %s",
    async (key, scope) => {
      const started = Promise.withResolvers<void>();
      const finish = Promise.withResolvers<void>();

      const stale = Effect.runPromise(
        cache.getOrSetJson({
          ...key,
          codec,
          ttlSeconds: 30,
          factory: fromPromise(async () => {
            started.resolve();
            await finish.promise;

            return { value: 1 };
          }),
        }),
      );

      await started.promise;

      try {
        await Effect.runPromise(cache.invalidateScopes(scope));
        expect(await write(key, 2)).toEqual({ value: 2 });
      } finally {
        finish.resolve();
      }

      await stale;
      expect(await read(key)).toEqual({ value: 2 });
    },
  );
});
