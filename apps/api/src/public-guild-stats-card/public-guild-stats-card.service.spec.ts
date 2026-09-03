import { vi } from "#test/bun-test";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { mockFn } from "#src/test/mock-fn";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Effect } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import {
  makePublicGuildStatsCard,
  type PublicGuildStatsCard,
  PublicGuildStatsCardImageAdapter,
} from "./public-guild-stats-card.service.js";

type PromiseStatsCard = {
  [Key in keyof PublicGuildStatsCard]: PublicGuildStatsCard[Key] extends (
    ...arguments_: infer Arguments
  ) => Effect.Effect<infer Success, infer _Failure>
    ? (...arguments_: Arguments) => Promise<Success>
    : never;
};

describe("public guild stats card Effect module", () => {
  const unavailableHttpClient = {} as HttpClientValue;
  let service: PromiseStatsCard;
  let repository: {
    findActiveGuild: ReturnType<typeof mockFn>;
    getLootStats: ReturnType<typeof mockFn>;
  };

  const createService = (environment: RuntimeEnvironment) => {
    const effect = <A>(operation: () => Promise<A>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (error) => error,
      });
    const effectService = makePublicGuildStatsCard({
      repository: {
        findActiveGuild: (guildId) =>
          effect(() => repository.findActiveGuild(guildId)),
        getLootStats: (guildId, dateFrom) =>
          effect(() => repository.getLootStats(guildId, dateFrom)),
      } as never,
      cache: {
        get: (key) => effect(() => redis.get(key)),
        set: (key, value, ttl) => effect(() => redis.set(key, value, ttl)),
        setNX: (key, value, ttl) => effect(() => redis.setNX(key, value, ttl)),
        del: (key) => effect(() => redis.del(key)),
      } as never,
      environment,
      image: new PublicGuildStatsCardImageAdapter(unavailableHttpClient),
    });
    return new Proxy(effectService, {
      get(target, property) {
        const operation = Reflect.get(target, property) as (
          ...arguments_: unknown[]
        ) => Effect.Effect<unknown, unknown>;
        return (...arguments_: unknown[]) =>
          Effect.runPromise(Reflect.apply(operation, target, arguments_));
      },
    }) as PromiseStatsCard;
  };
  let redis: {
    get: ReturnType<typeof mockFn>;
    set: ReturnType<typeof mockFn>;
    setNX: ReturnType<typeof mockFn>;
    del: ReturnType<typeof mockFn>;
  };

  beforeEach(() => {
    repository = {
      findActiveGuild: mockFn(),
      getLootStats: mockFn(),
    };
    redis = {
      get: mockFn(),
      set: mockFn(),
      setNX: mockFn(),
      del: mockFn(),
    };
    service = createService(RuntimeEnvironment.PROD);

    vi.stubGlobal("fetch", mockFn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns cached png for enabled guild without querying stats", async () => {
    const cachedImage = Buffer.from("cached-png");
    redis.get.mockResolvedValue(cachedImage.toString("base64"));
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });

    const result = await service.getStatsCard("guild-1");

    expect(result).toEqual(cachedImage);
    expect(repository.findActiveGuild).toHaveBeenCalledTimes(1);
    expect(repository.getLootStats).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("throws not found for missing or inactive guild", async () => {
    redis.get.mockResolvedValue(null);
    repository.findActiveGuild.mockResolvedValue(null);

    await expect(service.getStatsCard("guild-1")).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(repository.findActiveGuild).toHaveBeenCalledWith("guild-1");
  });

  it("throws not found and skips cache for disabled guild", async () => {
    redis.get.mockResolvedValue(Buffer.from("cached-png").toString("base64"));
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: false,
    });

    await expect(service.getStatsCard("guild-1")).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );

    expect(redis.get).not.toHaveBeenCalled();
    expect(repository.getLootStats).not.toHaveBeenCalled();
  });

  it("renders and caches a png with zero stats", async () => {
    redis.get.mockResolvedValue(null);
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild <One>",
      icon: null,
      publicStatsCardEnabled: true,
    });
    repository.getLootStats.mockResolvedValue({
      totalLoots: 0,
      legendaryItems: 0,
      heroicItems: 0,
    });

    const result = await service.getStatsCard("guild-1");

    expect(result.subarray(1, 4).toString()).toBe("PNG");
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      result.toString("base64"),
      86_400,
    );
  });

  it("bypasses cache in local environment", async () => {
    service = createService(RuntimeEnvironment.LOCAL);
    redis.get.mockResolvedValue(Buffer.from("cached-png").toString("base64"));
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    repository.getLootStats.mockResolvedValue({
      totalLoots: 7,
      legendaryItems: 1,
      heroicItems: 2,
    });

    const result = await service.getStatsCard("guild-1");

    expect(result.subarray(1, 4).toString()).toBe("PNG");
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(repository.findActiveGuild).toHaveBeenCalledTimes(1);
  });

  it("uses last 30 days aggregation values", async () => {
    redis.get.mockResolvedValue(null);
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    repository.getLootStats.mockResolvedValue({
      totalLoots: 42,
      legendaryItems: 3,
      heroicItems: 12,
    });

    await service.getStatsCard("guild-1");

    expect(repository.getLootStats).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      expect.any(String),
      86_400,
    );
  });

  it("refreshes and caches a png when cooldown is available", async () => {
    redis.setNX.mockResolvedValue(true);
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    repository.getLootStats.mockResolvedValue({
      totalLoots: 42,
      legendaryItems: 3,
      heroicItems: 12,
    });

    const result = await service.refreshStatsCard("guild-1");

    expect(result.nextRefreshAt).toEqual(expect.any(String));
    expect(redis.setNX).toHaveBeenCalledWith(
      "guild-stats-card-refresh:guild-1",
      expect.any(String),
      300,
    );
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      expect.any(String),
      86_400,
    );
  });

  it("rate limits refreshes for five minutes", async () => {
    redis.setNX.mockResolvedValue(false);
    redis.get.mockResolvedValue("2026-05-03T23:05:00.000Z");
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });

    await expect(service.refreshStatsCard("guild-1")).rejects.toMatchObject({
      kind: "rate-limited",
      response: {
        nextRefreshAt: "2026-05-03T23:05:00.000Z",
      },
    });

    expect(redis.set).not.toHaveBeenCalled();
    expect(repository.getLootStats).not.toHaveBeenCalled();
  });

  it("releases refresh cooldown when regeneration fails", async () => {
    const error = new Error("stats unavailable");
    redis.setNX.mockResolvedValue(true);
    repository.findActiveGuild.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    repository.getLootStats.mockRejectedValue(error);

    await expect(service.refreshStatsCard("guild-1")).rejects.toThrow(error);

    expect(redis.del).toHaveBeenCalledWith("guild-stats-card-refresh:guild-1");
    expect(redis.set).not.toHaveBeenCalled();
  });
});
