import { NotFoundException } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { serviceConfig } from "#src/config/service.config";
import { mockFn } from "#src/test/mock-fn";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { PublicGuildStatsCardRepository } from "./public-guild-stats-card.repository.js";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service.js";

describe("PublicGuildStatsCardService", () => {
  let service: PublicGuildStatsCardService;
  let repository: {
    findActiveGuild: ReturnType<typeof mockFn>;
    getLootStats: ReturnType<typeof mockFn>;
  };
  let redis: {
    get: ReturnType<typeof mockFn>;
    set: ReturnType<typeof mockFn>;
    setNX: ReturnType<typeof mockFn>;
    del: ReturnType<typeof mockFn>;
  };

  beforeEach(() => {
    serviceConfig.env = RuntimeEnvironment.PROD;
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
    service = new PublicGuildStatsCardService(
      repository as unknown as PublicGuildStatsCardRepository,
      redis as unknown as RedisService,
    );

    vi.stubGlobal("fetch", mockFn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    serviceConfig.env = RuntimeEnvironment.LOCAL;
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
      NotFoundException,
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
      NotFoundException,
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
    serviceConfig.env = RuntimeEnvironment.LOCAL;
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
      response: {
        nextRefreshAt: "2026-05-03T23:05:00.000Z",
      },
      status: 429,
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
