import { afterEach, expect, it, mock, spyOn } from "bun:test";
import {
  PutObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { gunzipSync } from "node:zlib";
import type { RawBattleData } from "#src/battles/battle-service";
import { Redacted, Schema } from "effect";
import { makeBattleObjectStorage } from "./battle-object-storage.js";

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
      {
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
      },
      {
        region: "auto",
        endpoint: "https://r2.invalid",
        bucketName: "test",
        accessKeyId: Redacted.make("test"),
        secretAccessKey: Redacted.make("test"),
      },
    );

    await expect(storage.deleteBattlesData(["one"])).rejects.toThrow(
      `${failure} unavailable`,
    );
    await expect(storage.deleteBattlesData(["one"])).resolves.toEqual([]);
    expect(send).toHaveBeenCalledTimes(2);
  });
}

const rawBattleData: RawBattleData = {
  battleId: "one",
  timestamp: "2026-09-09T00:00:00.000Z",
  rawData: {
    accountId: "account",
    characterId: "character",
    world: "world",
    events: [],
  },
};

const createStorage = (
  overrides: Partial<Parameters<typeof makeBattleObjectStorage>[0]> = {},
) =>
  makeBattleObjectStorage(
    {
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
    },
    {
      region: "auto",
      endpoint: "https://r2.invalid",
      bucketName: "test",
      accessKeyId: Redacted.make("test"),
      secretAccessKey: Redacted.make("test"),
    },
  );

it("keeps the first accepted object when the same battle is uploaded again", async () => {
  const objects = new Map<string, Uint8Array>();
  spyOn(S3Client.prototype, "send").mockImplementation(async (command) => {
    if (!(command instanceof PutObjectCommand))
      throw new Error("Unexpected command");
    const { Key, Body, IfNoneMatch } = command.input;

    if (!Key || !(Body instanceof Uint8Array))
      throw new Error("Invalid object");

    if (IfNoneMatch === "*" && objects.has(Key)) {
      throw new S3ServiceException({
        name: "PreconditionFailed",
        $fault: "client",
        $metadata: { httpStatusCode: 412 },
      });
    }

    objects.set(Key, Body);

    return {};
  });
  const storage = createStorage();
  await storage.uploadBattleData("one", rawBattleData);
  await storage.uploadBattleData("one", {
    ...rawBattleData,
    rawData: { ...rawBattleData.rawData, world: "changed" },
  });

  const stored = objects.get("battles/one.json");

  if (!stored) throw new Error("Object not stored");
  expect(JSON.parse(gunzipSync(stored).toString())).toEqual(rawBattleData);
});

for (const status of [409, 503]) {
  it(`propagates object upload failure ${status} and permits a retry`, async () => {
    let attempts = 0;

    const send = spyOn(S3Client.prototype, "send").mockImplementation(
      async () => {
        if (++attempts === 1)
          throw new S3ServiceException({
            name: "StorageFailure",
            $fault: "server",
            $metadata: { httpStatusCode: status },
          });

        return {};
      },
    );

    const storage = createStorage();
    await expect(
      storage.uploadBattleData("one", rawBattleData),
    ).rejects.toThrow();
    await expect(
      storage.uploadBattleData("one", rawBattleData),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });
}

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
    await createStorage().deleteBattlesData(["one", "two", "three"]),
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
    expect(await storage.getBattleData("large", decode)).toEqual({
      log: "ą".repeat(150_000),
    });
    expect(await storage.getBattleData("small", decode)).toEqual({
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

  await storage.cacheData("current", "{}");
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

  expect(await storage.getBattleData("durable", decode)).toEqual({
    log: "durable battle",
  });
});
