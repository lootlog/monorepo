import { NotFoundException } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { serviceConfig } from "#src/config/service.config";
import { PrismaService } from "#src/db/prisma.service";
import { mockFn } from "#src/test/mock-fn";
import { RuntimeEnvironment } from "@lootlog/types";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service.js";

describe("PublicGuildStatsCardService", () => {
  let service: PublicGuildStatsCardService;
  let prisma: {
    guild: { findFirst: ReturnType<typeof mockFn> };
    $queryRaw: ReturnType<typeof mockFn>;
  };
  let redis: {
    get: ReturnType<typeof mockFn>;
    set: ReturnType<typeof mockFn>;
    setNX: ReturnType<typeof mockFn>;
    del: ReturnType<typeof mockFn>;
  };

  beforeEach(() => {
    serviceConfig.env = RuntimeEnvironment.PROD;
    prisma = {
      guild: {
        findFirst: mockFn(),
      },
      $queryRaw: mockFn(),
    };
    redis = {
      get: mockFn(),
      set: mockFn(),
      setNX: mockFn(),
      del: mockFn(),
    };
    service = new PublicGuildStatsCardService(
      prisma as unknown as PrismaService,
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
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });

    const result = await service.getStatsCard("guild-1");

    expect(result).toEqual(cachedImage);
    expect(prisma.guild.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("throws not found for missing or inactive guild", async () => {
    redis.get.mockResolvedValue(null);
    prisma.guild.findFirst.mockResolvedValue(null);

    await expect(service.getStatsCard("guild-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.guild.findFirst).toHaveBeenCalledWith({
      where: {
        id: "guild-1",
        active: true,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        publicStatsCardEnabled: true,
      },
    });
  });

  it("throws not found and skips cache for disabled guild", async () => {
    redis.get.mockResolvedValue(Buffer.from("cached-png").toString("base64"));
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: false,
    });

    await expect(service.getStatsCard("guild-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(redis.get).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("renders and caches a png with zero stats", async () => {
    redis.get.mockResolvedValue(null);
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild <One>",
      icon: null,
      publicStatsCardEnabled: true,
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        total_loots: 0n,
        legendary_items: 0n,
        heroic_items: 0n,
      },
    ]);

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
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        total_loots: 7n,
        legendary_items: 1n,
        heroic_items: 2n,
      },
    ]);

    const result = await service.getStatsCard("guild-1");

    expect(result.subarray(1, 4).toString()).toBe("PNG");
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(prisma.guild.findFirst).toHaveBeenCalledTimes(1);
  });

  it("uses last 30 days aggregation values", async () => {
    redis.get.mockResolvedValue(null);
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        total_loots: 42n,
        legendary_items: 3n,
        heroic_items: 12n,
      },
    ]);

    await service.getStatsCard("guild-1");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      "guild-stats-card:guild-1:v2",
      expect.any(String),
      86_400,
    );
  });

  it("refreshes and caches a png when cooldown is available", async () => {
    redis.setNX.mockResolvedValue(true);
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        total_loots: 42n,
        legendary_items: 3n,
        heroic_items: 12n,
      },
    ]);

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
    prisma.guild.findFirst.mockResolvedValue({
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
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("releases refresh cooldown when regeneration fails", async () => {
    const error = new Error("stats unavailable");
    redis.setNX.mockResolvedValue(true);
    prisma.guild.findFirst.mockResolvedValue({
      id: "guild-1",
      name: "Guild One",
      icon: null,
      publicStatsCardEnabled: true,
    });
    prisma.$queryRaw.mockRejectedValue(error);

    await expect(service.refreshStatsCard("guild-1")).rejects.toThrow(error);

    expect(redis.del).toHaveBeenCalledWith("guild-stats-card-refresh:guild-1");
    expect(redis.set).not.toHaveBeenCalled();
  });
});
