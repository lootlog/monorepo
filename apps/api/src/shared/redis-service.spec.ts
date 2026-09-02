import { RedisService } from "#src/redis/redis.service";

type RedisCommandMock = ReturnType<
  typeof vi.fn<(...args: unknown[]) => unknown>
>;

type RedisClientMock = {
  scan: RedisCommandMock;
  del: RedisCommandMock;
  get: RedisCommandMock;
  set: RedisCommandMock;
  eval: RedisCommandMock;
  keys: RedisCommandMock;
};

const createRedisService = (client: RedisClientMock) => {
  const service = new RedisService({
    host: "localhost",
    port: 6379,
    prefix: "lootlog",
  });

  (service as unknown as { client: RedisClientMock }).client = client;

  return service;
};

const redisCommandMock = (): RedisCommandMock =>
  vi.fn<(...args: unknown[]) => unknown>();

const createRedisClient = (): RedisClientMock => ({
  scan: redisCommandMock(),
  del: redisCommandMock(),
  get: redisCommandMock(),
  set: redisCommandMock(),
  eval: redisCommandMock(),
  keys: redisCommandMock(),
});

describe("RedisService", () => {
  it("deletes pattern matches with SCAN batches instead of KEYS", async () => {
    const client = createRedisClient();
    client.scan
      .mockResolvedValueOnce(["12", ["lootlog:timer:a", "lootlog:timer:b"]])
      .mockResolvedValueOnce(["0", ["lootlog:timer:c"]]);
    client.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const service = createRedisService(client);

    const deletedCount = await service.deleteByPattern("timer:*");

    expect(deletedCount).toBe(3);
    expect(client.keys).not.toHaveBeenCalled();
    expect(client.scan).toHaveBeenNthCalledWith(
      1,
      "0",
      "MATCH",
      "lootlog:timer:*",
      "COUNT",
      500,
    );
    expect(client.scan).toHaveBeenNthCalledWith(
      2,
      "12",
      "MATCH",
      "lootlog:timer:*",
      "COUNT",
      500,
    );
    expect(client.del).toHaveBeenNthCalledWith(
      1,
      "lootlog:timer:a",
      "lootlog:timer:b",
    );
    expect(client.del).toHaveBeenNthCalledWith(2, "lootlog:timer:c");
  });

  it("keeps prefix handling scoped to the beginning of scanned keys", async () => {
    const client = createRedisClient();
    client.scan.mockResolvedValueOnce([
      "0",
      ["lootlog:abc", "external:lootlog:abc"],
    ]);
    const service = createRedisService(client);

    await expect(service.scan("*abc")).resolves.toEqual([
      "abc",
      "external:lootlog:abc",
    ]);
  });

  it("removes malformed JSON cache values", async () => {
    const client = createRedisClient();
    client.get.mockResolvedValueOnce("{bad-json");
    client.del.mockResolvedValueOnce(1);
    const service = createRedisService(client);

    await expect(service.getJson("cache:key")).resolves.toBeNull();

    expect(client.del).toHaveBeenCalledWith("lootlog:cache:key");
  });

  it("stores single-flight JSON results behind a short lock", async () => {
    const client = createRedisClient();
    client.get.mockResolvedValue(null);
    client.set.mockResolvedValueOnce("OK").mockResolvedValueOnce("OK");
    client.eval.mockResolvedValueOnce(1);
    const service = createRedisService(client);
    const factory = vi
      .fn<() => Promise<{ value: number }>>()
      .mockResolvedValue({ value: 1 });

    const result = await service.getOrSetJson({
      key: "cache:key",
      ttlSeconds: 60,
      factory,
    });

    expect(result).toEqual({ value: 1 });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenNthCalledWith(
      1,
      "lootlog:cache:key:single-flight",
      expect.any(String),
      "EX",
      10,
      "NX",
    );
    expect(client.set).toHaveBeenNthCalledWith(
      2,
      "lootlog:cache:key",
      JSON.stringify({ value: 1 }),
      "EX",
      60,
    );
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'),
      1,
      "lootlog:cache:key:single-flight",
      expect.any(String),
    );
  });

  it("waits for the in-flight writer before recomputing", async () => {
    const client = createRedisClient();
    client.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ cached: true }));
    client.set.mockResolvedValueOnce(null);
    const service = createRedisService(client);
    const factory = vi
      .fn<() => Promise<{ cached: boolean }>>()
      .mockResolvedValue({ cached: false });

    const result = await service.getOrSetJson({
      key: "cache:key",
      ttlSeconds: 60,
      factory,
      waitIntervalMs: 0,
      waitTimeoutMs: 100,
    });

    expect(result).toEqual({ cached: true });
    expect(factory).not.toHaveBeenCalled();
  });

  it("falls back to factory when Redis cache operations fail", async () => {
    const client = createRedisClient();
    const cacheError = new Error("Redis unavailable");
    client.get.mockRejectedValueOnce(cacheError);
    const service = createRedisService(client);
    const factory = vi
      .fn<() => Promise<{ fresh: boolean }>>()
      .mockResolvedValue({ fresh: true });
    const onError = vi.fn<(error: unknown) => void>();

    const result = await service.getOrSetJsonBestEffort({
      key: "cache:key",
      ttlSeconds: 60,
      factory,
      onError,
    });

    expect(result).toEqual({ fresh: true });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(cacheError);
  });

  it("does not swallow factory errors in best-effort mode", async () => {
    const client = createRedisClient();
    client.get.mockResolvedValue(null);
    client.set.mockResolvedValueOnce("OK");
    client.eval.mockResolvedValueOnce(1);
    const service = createRedisService(client);
    const factoryError = new Error("Domain error");
    const factory = vi
      .fn<() => Promise<{ fresh: boolean }>>()
      .mockRejectedValue(factoryError);
    const onError = vi.fn<(error: unknown) => void>();

    await expect(
      service.getOrSetJsonBestEffort({
        key: "cache:key",
        ttlSeconds: 60,
        factory,
        onError,
      }),
    ).rejects.toThrow(factoryError);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
