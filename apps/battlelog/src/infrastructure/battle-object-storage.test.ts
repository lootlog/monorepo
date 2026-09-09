import { afterEach, expect, it, mock, spyOn } from "bun:test";
import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { gunzipSync } from "node:zlib";
import type { RawBattleData } from "#src/battles/battle-service";
import { Redacted } from "effect";
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
        zremrangebyrank: async () => 0,
      },
      {
        region: "auto",
        endpoint: "https://r2.invalid",
        bucketName: "test",
        accessKeyId: Redacted.make("test"),
        secretAccessKey: Redacted.make("test"),
      },
    );

    await expect(storage.deleteBattleData("one")).rejects.toThrow(
      `${failure} unavailable`,
    );
    await expect(storage.deleteBattleData("one")).resolves.toBeUndefined();
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

const createStorage = () =>
  makeBattleObjectStorage(
    {
      del: async () => 1,
      zrem: async () => 1,
      get: async () => null,
      set: async () => {},
      zadd: async () => 1,
      zcard: async () => 0,
      zrange: async () => [],
      zremrangebyrank: async () => 0,
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
