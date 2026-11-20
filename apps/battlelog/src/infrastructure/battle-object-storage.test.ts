import { afterEach, expect, it, mock, spyOn } from "bun:test";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Effect, Redacted, Schema } from "effect";
import { Redis } from "effect/persistence";
import {
  type BattleObjectCache,
  makeBattleObjectStorage,
} from "./battle-object-storage.js";

type PromiseCache = {
  [Method in keyof BattleObjectCache]: (
    ...args: Parameters<BattleObjectCache[Method]>
  ) => Promise<Effect.Success<ReturnType<BattleObjectCache[Method]>>>;
};

const fromPromise = <A>(run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new Redis.RedisError({ cause }),
  });

const effectCache = (cache: PromiseCache): BattleObjectCache => ({
  del: (...keys) => fromPromise(() => cache.del(...keys)),
  zrem: (key, ...members) => fromPromise(() => cache.zrem(key, ...members)),
  get: (key) => fromPromise(() => cache.get(key)),
  set: (key, value, ttlSeconds) =>
    fromPromise(() => cache.set(key, value, ttlSeconds)),
  zadd: (key, score, member) =>
    fromPromise(() => cache.zadd(key, score, member)),
  zcard: (key) => fromPromise(() => cache.zcard(key)),
  zrange: (key, start, stop) =>
    fromPromise(() => cache.zrange(key, start, stop)),
  expire: (key, ttlSeconds) => fromPromise(() => cache.expire(key, ttlSeconds)),
  zremrangebyscore: (key, min, max) =>
    fromPromise(() => cache.zremrangebyscore(key, min, max)),
});

afterEach(() => mock.restore());

for (const failure of ["R2", "Redis"] as const) {
  it(`propagates ${failure} cleanup failure and succeeds when retried`, async () => {
    let calls = 0;

    const send = spyOn(S3Client.prototype, "send").mockImplementation(
      async () => {
        if (++calls === 1 && failure === "R2")
          throw new Error("R2 unavailable");

        return {};
      },
    );

    let cacheCalls = 0;

    const storage = makeBattleObjectStorage(
      effectCache({
        del: async () => {
          if (++cacheCalls === 1 && failure === "Redis")
            throw new Error("Redis unavailable");

          return 1;
        },
        zrem: async () => 1,
        get: async () => null,
        set: async () => {},
        zadd: async () => 1,
        zcard: async () => 0,
        zrange: async () => [],
        expire: async () => 1,
        zremrangebyscore: async () => 0,
      }),
      {
        region: "auto",
        endpoint: "https://r2.invalid",
        bucketName: "test",
        accessKeyId: Redacted.make("test"),
        secretAccessKey: Redacted.make("test"),
      },
    );

    const rejection = await Effect.runPromise(
      storage.deleteBattlesData(["one"]),
    ).catch((error) => error);

    expect(rejection.cause.message).toBe(`${failure} unavailable`);
    await expect(
      Effect.runPromise(storage.deleteBattlesData(["one"])),
    ).resolves.toEqual([]);
    expect(send).toHaveBeenCalledTimes(2);
  });
}

const createStorage = (overrides: Partial<PromiseCache> = {}) =>
  makeBattleObjectStorage(
    effectCache({
      del: async () => 1,
      zrem: async () => 1,
      get: async () => null,
      set: async () => {},
      zadd: async () => 1,
      zcard: async () => 0,
      zrange: async () => [],
      expire: async () => 1,
      zremrangebyscore: async () => 0,
      ...overrides,
    }),
    {
      region: "auto",
      endpoint: "https://r2.invalid",
      bucketName: "test",
      accessKeyId: Redacted.make("test"),
      secretAccessKey: Redacted.make("test"),
    },
  );

it("batches object removal and returns partial failures for durable retry", async () => {
  const batches: string[][] = [];
  spyOn(S3Client.prototype, "send").mockImplementation(async (command) => {
    if (!(command instanceof DeleteObjectsCommand))
      throw new Error("Unexpected command");
    batches.push(
      command.input.Delete?.Objects?.flatMap((object) =>
        object.Key ? [object.Key] : [],
      ) ?? [],
    );

    return { Errors: [{ Key: "battles/two.json", Code: "InternalError" }] };
  });
  expect(
    await Effect.runPromise(
      createStorage().deleteBattlesData(["one", "two", "three"]),
    ),
  ).toEqual(["two"]);
  expect(batches).toEqual([
    ["battles/one.json", "battles/two.json", "battles/three.json"],
  ]);
});

it("serves oversized UTF-8 objects from R2 without crowding small cached battles", async () => {
  const cached = new Map<string, string>();
  const reads: string[] = [];
  const touched: string[] = [];

  const payloads = new Map([
    ["battles/large.json", JSON.stringify({ log: "ą".repeat(150_000) })],
    ["battles/small.json", JSON.stringify({ log: "small battle" })],
  ]);

  spyOn(S3Client.prototype, "send").mockImplementation(async (command) => {
    if (!(command instanceof GetObjectCommand) || !command.input.Key)
      throw new Error("Unexpected command");
    reads.push(command.input.Key);
    const data = payloads.get(command.input.Key);

    if (!data) throw new Error("Missing object");

    return { Body: { transformToString: async () => data } };
  });

  const storage = createStorage({
    get: async (key) => cached.get(key) ?? null,
    set: async (key, value) => {
      cached.set(key, value);
    },
    expire: async (key) => {
      touched.push(key);

      return 1;
    },
  });

  const decode = Schema.decodeUnknownSync(
    Schema.fromJsonString(Schema.Struct({ log: Schema.String })),
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    expect(
      await Effect.runPromise(storage.getBattleData("large", decode)),
    ).toEqual({
      log: "ą".repeat(150_000),
    });
    expect(
      await Effect.runPromise(storage.getBattleData("small", decode)),
    ).toEqual({
      log: "small battle",
    });
  }

  expect(reads).toEqual([
    "battles/large.json",
    "battles/small.json",
    "battles/large.json",
  ]);
  expect(touched).toEqual(["battle:raw:small"]);
  expect([...cached.keys()]).toEqual(["battle:raw:small"]);
});

it("prunes expired recency entries before choosing a live cache eviction", async () => {
  const entries = new Map([["expired", Date.now() - 25 * 60 * 60 * 1_000]]);

  const storage = createStorage({
    zadd: async (_key, score, member) => {
      entries.set(member, score);

      return 1;
    },
    zremrangebyscore: async (_key, _min, max) => {
      for (const [id, timestamp] of entries)
        if (timestamp <= max) entries.delete(id);

      return 1;
    },
    zcard: async () => entries.size,
  });

  await Effect.runPromise(storage.cacheData("current", "{}"));
  expect([...entries.keys()]).toEqual(["current"]);
});

it("keeps durable raw battles readable while Redis is unavailable", async () => {
  spyOn(S3Client.prototype, "send").mockImplementation(async (command) => {
    if (!(command instanceof GetObjectCommand))
      throw new Error("Unexpected command");

    return {
      Body: {
        transformToString: async () =>
          JSON.stringify({ log: "durable battle" }),
      },
    };
  });

  const storage = createStorage({
    get: async () => {
      throw new Error("Redis unavailable");
    },
    set: async () => {
      throw new Error("Redis unavailable");
    },
  });

  const decode = Schema.decodeUnknownSync(
    Schema.fromJsonString(Schema.Struct({ log: Schema.String })),
  );

  expect(
    await Effect.runPromise(storage.getBattleData("durable", decode)),
  ).toEqual({
    log: "durable battle",
  });
});
