import type { Mock } from "vitest";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { RateLimitError } from "@discordjs/rest";
import { DiscordService } from "./discord.service";
import { AuthService } from "src/auth/auth.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import { RedlockService } from "src/lib/redlock/redlock.service";
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  InvalidScopesError,
} from "src/auth/errors";
import type { APIGuild, APIGuildMember } from "discord-api-types/v10";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";

vi.mock("src/config/service.config", () => ({
  serviceConfig: { env: "local" },
}));

describe("DiscordService", () => {
  let service: DiscordService;
  let authService: {
    getIdpToken: Mock;
  };
  let redisService: {
    get: Mock;
    set: Mock;
    del: Mock;
    getClient: Mock;
  };
  let rateLimiter: {
    checkRateLimitForUser: Mock;
    setRateLimitForUser: Mock;
    updateRateLimitFromHeaders: Mock;
  };
  let mockLogger: {
    log: Mock;
    warn: Mock;
    error: Mock;
    debug: Mock;
  };
  let mockRedlock: {
    acquire: Mock;
  };

  const mockGuilds: APIGuild[] = [
    {
      id: "guild-123",
      name: "Test Guild",
      icon: "icon.png",
      owner: false,
      permissions: "0",
      features: [],
    } as APIGuild,
  ];

  const mockGuildMember: APIGuildMember = {
    user: {
      id: "discord-123",
      username: "testuser",
      discriminator: "0001",
      avatar: "avatar.png",
      global_name: "Test User",
    },
    nick: null,
    avatar: null,
    roles: [],
    joined_at: "2021-01-01T00:00:00.000Z",
    deaf: false,
    mute: false,
  } as APIGuildMember;

  const mockToken = {
    accessToken: "mock-token",
    expiresIn: 3600,
    scopes: DISCORD_AUTH_SCOPES,
  };

  const createJsonResponse = (data: unknown) => ({
    headers: {
      get: mockFn((header: string) =>
        header.toLowerCase() === "content-type" ? "application/json" : null,
      ),
    },
    json: mockFn().mockResolvedValue(data),
    arrayBuffer: mockFn(),
    bodyUsed: false,
    ok: true,
    status: 200,
    statusText: "OK",
    text: mockFn(),
    body: null,
  });

  beforeEach(async () => {
    mockLogger = {
      log: mockFn(),
      warn: mockFn(),
      error: mockFn(),
      debug: mockFn(),
    };

    mockRedlock = {
      acquire: mockFn().mockResolvedValue({
        release: mockFn(),
      }),
    };

    const mockAuthService = {
      getIdpToken: mockFn(),
    };

    const mockRedisService = {
      get: mockFn(),
      set: mockFn(),
      del: mockFn(),
      getClient: mockFn().mockReturnValue({}),
    };

    const mockRateLimiter = {
      checkRateLimitForUser: mockFn().mockResolvedValue(false),
      setRateLimitForUser: mockFn(),
      updateRateLimitFromHeaders: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: DiscordRateLimiterService, useValue: mockRateLimiter },
        {
          provide: RedlockService,
          useValue: { createInstance: mockFn().mockReturnValue(mockRedlock) },
        },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    authService = module.get(AuthService);
    redisService = module.get(RedisService);
    rateLimiter = module.get(DiscordRateLimiterService);

    service["redlock"] = mockRedlock as never;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor and initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should set environment from config", () => {
      expect(service["isLocal"]).toBe(true);
    });
  });

  describe("getRestClient", () => {
    const userId = "user-123";
    const discordId = "discord-123";

    it("should create REST client with valid token", async () => {
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rest = await service.getRestClient(userId, discordId);

      expect(rest).toBeDefined();
      expect(authService.getIdpToken).toHaveBeenCalledWith(userId, discordId);
    });

    it("should throw UnauthorizedException when token is expired", async () => {
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      await expect(service.getRestClient(userId, discordId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when scopes are invalid", async () => {
      authService.getIdpToken.mockRejectedValue(
        new InvalidScopesError(["required"], ["actual"]),
      );

      await expect(service.getRestClient(userId, discordId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw ServiceUnavailableException when auth service is unavailable", async () => {
      authService.getIdpToken.mockRejectedValue(
        new AuthServiceUnavailableError(),
      );

      await expect(service.getRestClient(userId, discordId)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("should validate required scopes", async () => {
      const invalidToken = {
        accessToken: "mock-token",
        scopes: ["guilds"],
      };
      authService.getIdpToken.mockResolvedValue(invalidToken as never);

      await expect(service.getRestClient(userId, discordId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("getUserGuilds", () => {
    const userId = "user-123";
    const discordId = "discord-123";

    it("should return cached guilds when available", async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockGuilds));

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual(mockGuilds);
      expect(redisService.get).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:data",
      );
      expect(mockRedlock.acquire).not.toHaveBeenCalled();
    });

    it("should fetch from Discord API when cache is empty", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(
          createJsonResponse(mockGuilds),
        ),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual(mockGuilds);
      expect(rateLimiter.checkRateLimitForUser).toHaveBeenCalledWith(
        userId,
        "guilds",
      );
      expect(mockRest.queueRequest).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:data",
        JSON.stringify(mockGuilds),
        10,
      );
      expect(redisService.set).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:stale",
        JSON.stringify(mockGuilds),
        300,
      );
    });

    it("should use redlock to prevent concurrent requests", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(
          createJsonResponse(mockGuilds),
        ),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      await service.getUserGuilds(userId, discordId);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ["user:user-123:discord-guilds:lock"],
        6000,
      );
    });

    it("should return empty array when no guilds found", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(createJsonResponse([])),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "warn",
        message: expect.stringContaining("No guilds found"),
      });
    });

    it("should return stale data when rate limited proactively", async () => {
      const staleGuilds = [{ id: "stale-guild" }];
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(staleGuilds));

      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual(staleGuilds);
      expect(redisService.get).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:stale",
      );
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "info",
        message: expect.stringContaining(
          "Returning stale guilds data due to rate limit",
        ),
      });
    });

    it("should return empty array when rate limited and no stale data", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "warn",
        message: expect.stringContaining(
          "Rate limited and no stale data available",
        ),
      });
    });

    it("should return stale data on rate limit error", async () => {
      const staleGuilds = [{ id: "stale-guild" }];
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(staleGuilds));
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rateLimitError = new RateLimitError({
        url: "test",
        method: "GET",
        hash: "test",
        limit: 5,
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 0,
        scope: "user",
        majorParameter: "test",
        route: "/test",
        timeToReset: 5000,
      });

      const mockRest = {
        queueRequest: mockFn().mockRejectedValue(rateLimitError),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual(staleGuilds);
      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        userId,
        "guilds",
        5000,
      );
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "info",
        message: expect.stringContaining(
          "Returning stale guilds data after rate limit error",
        ),
      });
    });

    it("should throw rate limit error when no stale data available", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rateLimitError = new RateLimitError({
        url: "test",
        method: "GET",
        hash: "test",
        limit: 5,
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 0,
        scope: "user",
        majorParameter: "test",
        route: "/test",
        timeToReset: 5000,
      });

      const mockRest = {
        queueRequest: mockFn().mockRejectedValue(rateLimitError),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      await expect(service.getUserGuilds(userId, discordId)).rejects.toThrow(
        RateLimitError,
      );

      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        userId,
        "guilds",
        5000,
      );
    });

    it("should cache empty array on UnauthorizedException", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      await expect(service.getUserGuilds(userId, discordId)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(redisService.set).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:data",
        JSON.stringify([]),
        5,
      );
    });
  });

  describe("getUserGuildsSnapshot", () => {
    const userId = "user-123";
    const discordId = "discord-123";

    it("should return cached guilds with cache source", async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockGuilds));

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: mockGuilds,
        source: "cache",
      });
      expect(mockRedlock.acquire).not.toHaveBeenCalled();
    });

    it("should treat cached empty guilds as unavailable", async () => {
      redisService.get.mockResolvedValue(JSON.stringify([]));

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: [],
        source: "unavailable",
      });
      expect(mockRedlock.acquire).not.toHaveBeenCalled();
    });

    it("should return fresh source when Discord API returns guilds", async () => {
      redisService.get.mockResolvedValue(null);

      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(
          createJsonResponse(mockGuilds),
        ),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: mockGuilds,
        source: "fresh",
      });
    });

    it("should return fresh empty source when Discord API returns no guilds", async () => {
      redisService.get.mockResolvedValue(null);

      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(createJsonResponse([])),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: [],
        source: "fresh",
      });
    });

    it("should return stale source when proactively rate limited with stale data", async () => {
      const staleGuilds = [{ id: "stale-guild" }];
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(staleGuilds));
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: staleGuilds,
        source: "stale",
      });
    });

    it("should return unavailable source when rate limited without stale data", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: [],
        source: "unavailable",
      });
    });

    it("should return unavailable source and cache empty guilds on UnauthorizedException", async () => {
      redisService.get.mockResolvedValue(null);
      vi.spyOn(service, "getRestClient").mockRejectedValue(
        new UnauthorizedException(),
      );

      const result = await service.getUserGuildsSnapshot(userId, discordId);

      expect(result).toEqual({
        guilds: [],
        source: "unavailable",
      });
      expect(redisService.set).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:data",
        JSON.stringify([]),
        5,
      );
    });
  });

  describe("getGuildMember", () => {
    const options = {
      guildId: "guild-123",
      userId: "user-123",
      discordId: "discord-123",
    };

    it("should return cached member when available", async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockGuildMember));

      const result = await service.getGuildMember(options);

      expect(result).toEqual(mockGuildMember);
      expect(redisService.get).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:data",
      );
      expect(mockRedlock.acquire).not.toHaveBeenCalled();
    });

    it("should return null when cached null value exists", async () => {
      redisService.get.mockResolvedValue(JSON.stringify(null));

      const result = await service.getGuildMember(options);

      expect(result).toBeNull();
    });

    it("should fetch from Discord API when cache is empty", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn<() => Promise<unknown>>().mockResolvedValue(
          createJsonResponse(mockGuildMember),
        ),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getGuildMember(options);

      expect(result).toEqual(mockGuildMember);
      expect(rateLimiter.checkRateLimitForUser).toHaveBeenCalledWith(
        options.userId,
        "guild-member",
      );
      expect(redisService.set).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:data",
        JSON.stringify(mockGuildMember),
        10,
      );
      expect(redisService.set).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:stale",
        JSON.stringify(mockGuildMember),
        300,
      );
    });

    it("should throw NotFoundException when member not found (404)", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const notFoundError = { status: 404, message: "Not Found" };
      const mockRest = {
        queueRequest: mockFn().mockRejectedValue(notFoundError),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      await expect(service.getGuildMember(options)).rejects.toThrow(
        NotFoundException,
      );

      expect(redisService.set).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:data",
        JSON.stringify(null),
        30,
      );
    });

    it("should return stale data when rate limited proactively", async () => {
      const staleMember = { user: { id: "stale" } };
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(staleMember));

      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      const result = await service.getGuildMember(options);

      expect(result).toEqual(staleMember);
      expect(redisService.get).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:stale",
      );
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "info",
        message: expect.stringContaining(
          "Returning stale member data due to rate limit",
        ),
      });
    });

    it("should return null when rate limited and no stale data", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      const result = await service.getGuildMember(options);

      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "warn",
        message: expect.stringContaining(
          "Rate limited and no stale data available",
        ),
      });
    });

    it("should return stale data on rate limit error", async () => {
      const staleMember = { user: { id: "stale" } };
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(staleMember));
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rateLimitError = new RateLimitError({
        url: "test",
        method: "GET",
        hash: "test",
        limit: 5,
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 0,
        scope: "user",
        majorParameter: "test",
        route: "/test",
        timeToReset: 5000,
      });

      const mockRest = {
        queueRequest: mockFn().mockRejectedValue(rateLimitError),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      const result = await service.getGuildMember(options);

      expect(result).toEqual(staleMember);
      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        options.userId,
        "guild-member",
        5000,
      );
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "info",
        message: expect.stringContaining(
          "Returning stale member data after rate limit error",
        ),
      });
    });

    it("should throw rate limit error when no stale data available", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rateLimitError = new RateLimitError({
        url: "test",
        method: "GET",
        hash: "test",
        limit: 5,
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 0,
        scope: "user",
        majorParameter: "test",
        route: "/test",
        timeToReset: 5000,
      });

      const mockRest = {
        queueRequest: mockFn().mockRejectedValue(rateLimitError),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      await expect(service.getGuildMember(options)).rejects.toThrow(
        RateLimitError,
      );

      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        options.userId,
        "guild-member",
        5000,
      );
    });

    it("should cache null on UnauthorizedException", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      await expect(service.getGuildMember(options)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(redisService.set).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:data",
        JSON.stringify(null),
        5,
      );
    });

    it("should use redlock to prevent concurrent requests", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn<() => Promise<unknown>>().mockResolvedValue(
          createJsonResponse(mockGuildMember),
        ),
      };
      vi.spyOn(service, "getRestClient").mockResolvedValue(mockRest as never);

      await service.getGuildMember(options);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ["guild:guild-123:member:user-123:lock"],
        6000,
      );
    });
  });

  describe("clearUserGuildIdsCache", () => {
    it("should delete cache for user guilds", async () => {
      await service.clearUserGuildIdsCache("user-123");

      expect(redisService.del).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:data",
      );
    });
  });
});
