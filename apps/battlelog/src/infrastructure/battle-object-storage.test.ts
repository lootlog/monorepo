import { afterEach, expect, it, mock, spyOn } from "bun:test";
import { S3Client } from "@aws-sdk/client-s3";
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
