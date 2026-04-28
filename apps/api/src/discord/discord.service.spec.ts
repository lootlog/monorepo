import type { Mock } from "vitest";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { RateLimitError } from "@discordjs/rest";
import { DiscordGuildMemberClient } from "./discord-guild-member.client";
import { DiscordRestClientFactory } from "./discord-rest-client.factory";
import { DiscordService } from "./discord.service";
import { DiscordUserGuildsClient } from "./discord-user-guilds.client";
import { AuthService } from "src/auth/auth.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { DiscordRateLimiterService } from "./discord-rate-limiter.service";
import { DiscordSyncDiagnosticsService } from "./discord-sync-diagnostics.service";
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
  let restClientFactory: DiscordRestClientFactory;
  let userGuildsClient: DiscordUserGuildsClient;
  let guildMemberClient: DiscordGuildMemberClient;
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
    getNextAvailableAtForUser: Mock;
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
  let diagnostics: {
    recordInvalidDiscordRequest: Mock;
    recordMemberRefreshMetric: Mock;
    recordMemberRefreshLatency: Mock;
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
      getNextAvailableAtForUser: mockFn().mockResolvedValue(null),
      setRateLimitForUser: mockFn(),
      updateRateLimitFromHeaders: mockFn(),
    };

    const mockDiagnostics = {
      recordInvalidDiscordRequest: mockFn().mockResolvedValue(undefined),
      recordMemberRefreshMetric: mockFn().mockResolvedValue(undefined),
      recordMemberRefreshLatency: mockFn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        DiscordRestClientFactory,
        DiscordUserGuildsClient,
        DiscordGuildMemberClient,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: DiscordRateLimiterService, useValue: mockRateLimiter },
        { provide: DiscordSyncDiagnosticsService, useValue: mockDiagnostics },
        {
          provide: RedlockService,
          useValue: { createInstance: mockFn().mockReturnValue(mockRedlock) },
        },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    restClientFactory = module.get(DiscordRestClientFactory);
    userGuildsClient = module.get(DiscordUserGuildsClient);
    guildMemberClient = module.get(DiscordGuildMemberClient);
    authService = module.get(AuthService);
    redisService = module.get(RedisService);
    rateLimiter = module.get(DiscordRateLimiterService);
    diagnostics = module.get(
      DiscordSyncDiagnosticsService,
    ) as typeof diagnostics;

    userGuildsClient["redlock"] = mockRedlock as never;
    guildMemberClient["redlock"] = mockRedlock as never;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor and initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should set environment from config", () => {
      expect(userGuildsClient["isLocal"]).toBe(true);
      expect(guildMemberClient["isLocal"]).toBe(true);
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
        "user:user-123:discord-guilds:v2:data",
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual(mockGuilds);
      expect(rateLimiter.checkRateLimitForUser).toHaveBeenCalledWith(
        userId,
        "guilds",
      );
      expect(mockRest.queueRequest).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:v2:data",
        JSON.stringify(mockGuilds),
        10,
      );
    });

    it("should fetch all Discord guild pages before caching", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const firstPage = Array.from(
        { length: 200 },
        (_, index) =>
          ({
            ...mockGuilds[0],
            id: `guild-${index.toString().padStart(3, "0")}`,
          }) as APIGuild,
      );
      const secondPage = [
        {
          ...mockGuilds[0],
          id: "guild-200",
        } as APIGuild,
      ];
      const mockRest = {
        queueRequest: mockFn()
          .mockResolvedValueOnce(createJsonResponse(firstPage))
          .mockResolvedValueOnce(createJsonResponse(secondPage)),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual([...firstPage, ...secondPage]);
      expect(mockRest.queueRequest).toHaveBeenCalledTimes(2);
      const firstCall = mockRest.queueRequest.mock.calls[0][0] as {
        query: URLSearchParams;
      };
      const secondCall = mockRest.queueRequest.mock.calls[1][0] as {
        query: URLSearchParams;
      };
      expect(firstCall.query.toString()).toBe("limit=200");
      expect(secondCall.query.toString()).toBe("limit=200&after=guild-199");
      expect(redisService.set).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:v2:data",
        JSON.stringify([...firstPage, ...secondPage]),
        10,
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      const result = await service.getUserGuilds(userId, discordId);

      expect(result).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith({
        level: "warn",
        message: expect.stringContaining("No guilds found"),
      });
    });

    it("should throw when rate limited proactively", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);
      rateLimiter.getNextAvailableAtForUser.mockResolvedValue(
        new Date(Date.now() + 5000),
      );

      await expect(
        service.getUserGuilds(userId, discordId),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it("should throw rate limit when no retry time is known", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      await expect(
        service.getUserGuilds(userId, discordId),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it("should throw rate limit error without returning stale data", async () => {
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(
        service.getUserGuilds(userId, discordId),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        userId,
        "guilds",
        5000,
      );
      expect(diagnostics.recordInvalidDiscordRequest).toHaveBeenCalledWith({
        endpoint: "guilds",
        status: 429,
        source: "discord-service",
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(
        service.getUserGuilds(userId, discordId),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        userId,
        "guilds",
        5000,
      );
    });

    it("should not cache empty array on UnauthorizedException", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      await expect(service.getUserGuilds(userId, discordId)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe("getFreshCompleteUserGuilds", () => {
    const userId = "user-123";
    const discordId = "discord-123";
    const handoffKey =
      "user:user-123:discord:discord-123:fresh-complete-guilds:handoff";

    it("should bypass cached guilds and mark the Discord result as fresh and complete", async () => {
      redisService.get.mockImplementation((key: string) => {
        return Promise.resolve(
          key === "user:user-123:discord-guilds:v2:data"
            ? JSON.stringify(mockGuilds)
            : null,
        );
      });
      const freshGuilds = [
        {
          ...mockGuilds[0],
          id: "guild-fresh",
        } as APIGuild,
      ];
      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(
          createJsonResponse(freshGuilds),
        ),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      const result = await service.getFreshCompleteUserGuilds(
        userId,
        discordId,
      );

      expect(result).toEqual({
        guilds: freshGuilds,
        fresh: true,
        complete: true,
      });
      expect(redisService.get).not.toHaveBeenCalledWith(
        "user:user-123:discord-guilds:v2:data",
      );
      expect(redisService.set).toHaveBeenCalledWith(
        handoffKey,
        JSON.stringify({
          guilds: freshGuilds,
          fresh: true,
          complete: true,
        }),
        2,
      );
      expect(mockRest.queueRequest).toHaveBeenCalledTimes(1);
    });

    it("should return a distributed handoff result without calling Discord", async () => {
      const handoffResult = {
        guilds: [
          {
            ...mockGuilds[0],
            id: "guild-handoff",
          } as APIGuild,
        ],
        fresh: true,
        complete: true,
      } as const;
      redisService.get.mockResolvedValue(JSON.stringify(handoffResult));
      const getRestClientSpy = vi.spyOn(restClientFactory, "getRestClient");

      const result = await service.getFreshCompleteUserGuilds(
        userId,
        discordId,
      );

      expect(result).toEqual(handoffResult);
      expect(mockRedlock.acquire).not.toHaveBeenCalled();
      expect(getRestClientSpy).not.toHaveBeenCalled();
    });

    it("should use a distributed lock and handoff result before fetching Discord", async () => {
      const handoffResult = {
        guilds: [
          {
            ...mockGuilds[0],
            id: "guild-after-lock",
          } as APIGuild,
        ],
        fresh: true,
        complete: true,
      } as const;
      redisService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(handoffResult));
      const getRestClientSpy = vi.spyOn(restClientFactory, "getRestClient");

      const result = await service.getFreshCompleteUserGuilds(
        userId,
        discordId,
      );

      expect(result).toEqual(handoffResult);
      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ["user:user-123:discord:discord-123:fresh-complete-guilds:lock"],
        15000,
      );
      expect(getRestClientSpy).not.toHaveBeenCalled();
    });

    it("should share one Discord request between concurrent fresh guild lookups for the same user", async () => {
      const freshGuilds = [
        {
          ...mockGuilds[0],
          id: "guild-single-flight",
        } as APIGuild,
      ];
      let resolveResponse: (
        response: ReturnType<typeof createJsonResponse>,
      ) => void = () => {};
      const responsePromise = new Promise<
        ReturnType<typeof createJsonResponse>
      >((resolve) => {
        resolveResponse = resolve;
      });
      const mockRest = {
        queueRequest: mockFn().mockReturnValue(responsePromise),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      const firstRequest = service.getFreshCompleteUserGuilds(
        userId,
        discordId,
      );
      const secondRequest = service.getFreshCompleteUserGuilds(
        userId,
        discordId,
      );

      resolveResponse(createJsonResponse(freshGuilds));

      await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual(
        [
          {
            guilds: freshGuilds,
            fresh: true,
            complete: true,
          },
          {
            guilds: freshGuilds,
            fresh: true,
            complete: true,
          },
        ],
      );
      expect(mockRest.queueRequest).toHaveBeenCalledTimes(1);
    });

    it("should clear the shared fresh guild request after a failure", async () => {
      const freshGuilds = [
        {
          ...mockGuilds[0],
          id: "guild-after-retry",
        } as APIGuild,
      ];
      const mockRest = {
        queueRequest: mockFn()
          .mockRejectedValueOnce(new Error("boom"))
          .mockResolvedValueOnce(createJsonResponse(freshGuilds)),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(
        service.getFreshCompleteUserGuilds(userId, discordId),
      ).rejects.toThrow(ServiceUnavailableException);

      await expect(
        service.getFreshCompleteUserGuilds(userId, discordId),
      ).resolves.toEqual({
        guilds: freshGuilds,
        fresh: true,
        complete: true,
      });
      expect(mockRest.queueRequest).toHaveBeenCalledTimes(2);
    });

    it("should throw without returning a partial marker when pagination cannot advance", async () => {
      const fullPage = Array.from(
        { length: 200 },
        () =>
          ({
            ...mockGuilds[0],
            id: "guild-loop",
          }) as APIGuild,
      );
      const mockRest = {
        queueRequest: mockFn().mockResolvedValue(createJsonResponse(fullPage)),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(
        service.getFreshCompleteUserGuilds(userId, discordId),
      ).rejects.toThrow(ServiceUnavailableException);
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

    it("should ignore legacy cached null member values", async () => {
      redisService.get
        .mockResolvedValueOnce(JSON.stringify(null))
        .mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn<() => Promise<unknown>>().mockResolvedValue(
          createJsonResponse(mockGuildMember),
        ),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      const result = await service.getGuildMember(options);

      expect(result).toEqual(mockGuildMember);
      expect(redisService.del).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:data",
      );
    });

    it("should fetch from Discord API when cache is empty", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        queueRequest: mockFn<() => Promise<unknown>>().mockResolvedValue(
          createJsonResponse(mockGuildMember),
        ),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

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
    });

    it("should throw NotFoundException when member not found (404)", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const notFoundError = { status: 404, message: "Not Found" };
      const mockRest = {
        queueRequest: mockFn().mockRejectedValue(notFoundError),
      };
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(service.getGuildMember(options)).rejects.toThrow(
        NotFoundException,
      );

      expect(redisService.set).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:not-found",
        "1",
        30,
      );
    });

    it("should throw when rate limited proactively", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);
      rateLimiter.getNextAvailableAtForUser.mockResolvedValue(
        new Date(Date.now() + 5000),
      );

      await expect(service.getGuildMember(options)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it("should throw rate limit when no retry time is known", async () => {
      redisService.get.mockResolvedValue(null);
      rateLimiter.checkRateLimitForUser.mockResolvedValue(true);

      await expect(service.getGuildMember(options)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it("should throw rate limit error without returning stale data", async () => {
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(service.getGuildMember(options)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        options.userId,
        "guild-member",
        5000,
      );
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

      await expect(service.getGuildMember(options)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      expect(rateLimiter.setRateLimitForUser).toHaveBeenCalledWith(
        options.userId,
        "guild-member",
        5000,
      );
    });

    it("should cache unauthorized state on UnauthorizedException", async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      await expect(service.getGuildMember(options)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(redisService.set).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:unauthorized",
        "1",
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
      vi.spyOn(restClientFactory, "getRestClient").mockResolvedValue(
        mockRest as never,
      );

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
        "user:user-123:discord-guilds:v2:data",
      );
      expect(redisService.del).toHaveBeenCalledWith(
        "user:user-123:discord-guilds:data",
      );
    });
  });

  describe("clearGuildMemberDataCache", () => {
    it("should delete cached guild member data", async () => {
      await service.clearGuildMemberDataCache({
        guildId: "guild-123",
        userId: "user-123",
      });

      expect(redisService.del).toHaveBeenCalledWith(
        "guild:guild-123:member:user-123:data",
      );
    });
  });
});
