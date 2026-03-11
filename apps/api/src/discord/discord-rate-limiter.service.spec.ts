import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import { RedisService } from "src/lib/redis/redis.service";

describe("DiscordRateLimiterService", () => {
  let service: DiscordRateLimiterService;
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    getClient: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  };

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockResolvedValue({
        keys: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordRateLimiterService,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<DiscordRateLimiterService>(DiscordRateLimiterService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkRateLimitForUser", () => {
    const userId = "user-123";
    const endpoint = "guilds";

    it("should return false when no rate limit data exists", async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.checkRateLimitForUser(userId, endpoint);

      expect(result).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guilds",
      );
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it("should delete and return false when rate limit has expired", async () => {
      const expiredData = {
        retryAfter: 1000,
        resetAt: Date.now() - 1000,
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredData));

      const result = await service.checkRateLimitForUser(userId, endpoint);

      expect(result).toBe(false);
      expect(redisService.del).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guilds",
      );
    });

    it("should return true when rate limit is active", async () => {
      const resetAt = Date.now() + 100;
      const activeData = {
        retryAfter: 100,
        resetAt,
      };
      redisService.get.mockResolvedValue(JSON.stringify(activeData));

      const result = await service.checkRateLimitForUser(userId, endpoint);

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "warn",
        message: expect.stringContaining("Rate limit active"),
        userId,
        endpoint,
        resetAt: expect.any(String),
      });
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it("should not block when bucket state still has remaining requests", async () => {
      const resetAt = Date.now() + 60_000;
      const activeData = {
        bucket: "bucket-1",
        limit: 5,
        remaining: 3,
        retryAfter: 0,
        resetAt,
      };
      redisService.get.mockResolvedValue(JSON.stringify(activeData));

      const result = await service.checkRateLimitForUser(userId, endpoint);

      expect(result).toBe(false);
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          message: expect.stringContaining("Rate limit active"),
        }),
      );
    });
  });

  describe("updateRateLimitFromHeaders", () => {
    const userId = "user-123";
    const endpoint = "guild-member";

    it("should persist header state without marking the bucket blocked when requests remain", async () => {
      const headers = {
        get: jest.fn((name: string) => {
          switch (name.toLowerCase()) {
            case "x-ratelimit-bucket":
              return "bucket-123";
            case "x-ratelimit-limit":
              return "5";
            case "x-ratelimit-remaining":
              return "4";
            case "x-ratelimit-reset-after":
              return "10";
            default:
              return null;
          }
        }),
      };

      await service.updateRateLimitFromHeaders(userId, endpoint, headers);

      expect(redisService.set).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guild-member",
        expect.stringContaining('"remaining":4'),
        10,
      );

      redisService.get.mockResolvedValue(
        (redisService.set.mock.calls[0] ?? [])[1] as string,
      );

      await expect(
        service.checkRateLimitForUser(userId, endpoint),
      ).resolves.toBe(false);
      await expect(
        service.getNextAvailableAtForUser(userId, endpoint),
      ).resolves.toBeNull();
    });
  });

  describe("setRateLimitForUser", () => {
    const userId = "user-123";
    const endpoint = "guilds";
    const retryAfterMs = 5000;

    it("should set rate limit data in Redis", async () => {
      await service.setRateLimitForUser(userId, endpoint, retryAfterMs);

      expect(redisService.set).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guilds",
        expect.stringContaining('"retryAfter":5000'),
        5,
      );
    });

    it("should log rate limit information", async () => {
      await service.setRateLimitForUser(userId, endpoint, retryAfterMs);

      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "warn",
        message: "Set rate limit for user",
        userId,
        endpoint,
        retryAfterMs,
        resetAt: expect.any(String),
        ttlSeconds: 5,
      });
    });

    it("should use minimum TTL of 1 second", async () => {
      await service.setRateLimitForUser(userId, endpoint, 500);

      expect(redisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        1,
      );
    });
  });

  describe("clearRateLimitForUser", () => {
    const userId = "user-123";

    it("should clear specific endpoint rate limit", async () => {
      await service.clearRateLimitForUser(userId, "guilds");

      expect(redisService.del).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guilds",
      );
    });

    it("should clear all user rate limits when endpoint not provided", async () => {
      const mockClient = {
        keys: jest
          .fn()
          .mockResolvedValue([
            "discord:ratelimit:user:user-123:guilds",
            "discord:ratelimit:user:user-123:guild-member",
          ]),
      };
      redisService.getClient.mockResolvedValue(mockClient as any);

      await service.clearRateLimitForUser(userId);

      expect(mockClient.keys).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:*",
      );
      expect(redisService.del).toHaveBeenCalledTimes(2);
      expect(redisService.del).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guilds",
      );
      expect(redisService.del).toHaveBeenCalledWith(
        "discord:ratelimit:user:user-123:guild-member",
      );
    });

    it("should not delete anything when no keys found", async () => {
      const mockClient = {
        keys: jest.fn().mockResolvedValue([]),
      };
      redisService.getClient.mockResolvedValue(mockClient as any);

      await service.clearRateLimitForUser(userId);

      expect(redisService.del).not.toHaveBeenCalled();
    });
  });
});
