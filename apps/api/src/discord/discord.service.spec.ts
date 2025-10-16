import { Test, TestingModule } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { DiscordRateLimiterService } from './discord-rate-limiter.service';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  TokenExpiredError,
  AuthServiceUnavailableError,
  InvalidScopesError,
} from 'src/auth/errors';
import { REST, RateLimitError } from '@discordjs/rest';
import { APIGuild, APIGuildMember } from 'discord-api-types/v10';
import { RuntimeEnvironment } from 'src/types/runtime.types';
import { ConfigKey } from 'src/config/config-key.enum';

describe('DiscordService', () => {
  let service: DiscordService;
  let authService: jest.Mocked<AuthService>;
  let redisService: jest.Mocked<RedisService>;
  let rateLimiter: jest.Mocked<DiscordRateLimiterService>;
  let configService: jest.Mocked<ConfigService>;
  let mockRedisClient: any;

  const mockToken = {
    accessToken: 'mock-access-token',
    expiresIn: 3600,
    scopes: ['guilds.members.read', 'guilds', 'identify', 'email'],
  };

  const mockGuild: APIGuild = {
    id: '123456',
    name: 'Test Guild',
    icon: null,
    owner: false,
    permissions: '0',
    features: [],
  } as APIGuild;

  const mockGuildMember: APIGuildMember = {
    user: {
      id: 'user-123',
      username: 'testuser',
      discriminator: '0001',
      avatar: null,
    },
    nick: null,
    roles: [],
    joined_at: '2021-01-01T00:00:00.000Z',
    deaf: false,
    mute: false,
  } as APIGuildMember;

  beforeEach(async () => {
    mockRedisClient = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    const mockAuthService = {
      getIdpToken: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockResolvedValue(mockRedisClient),
    };

    const mockRateLimiter = {
      checkRateLimitForPath: jest.fn(),
      updateFromHeaders: jest.fn(),
      updateFromRateLimitError: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === ConfigKey.SERVICE) {
          return { env: RuntimeEnvironment.LOCAL };
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: DiscordRateLimiterService,
          useValue: mockRateLimiter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    authService = module.get(AuthService);
    redisService = module.get(RedisService);
    rateLimiter = module.get(DiscordRateLimiterService);
    configService = module.get(ConfigService);

    // Initialize the service
    await service.onModuleInit();

    // Suppress logger output
    jest.spyOn(service['logger'], 'warn').mockImplementation();
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize redlock with redis client', async () => {
      expect(service['redlock']).toBeDefined();
      expect(redisService.getClient).toHaveBeenCalled();
    });
  });

  describe('getRestClient', () => {
    it('should create REST client with valid token', async () => {
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rest = await service.getRestClient('user-123');

      expect(authService.getIdpToken).toHaveBeenCalledWith('user-123');
      expect(rest).toBeInstanceOf(REST);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      await expect(service.getRestClient('user-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when scopes are invalid', async () => {
      authService.getIdpToken.mockRejectedValue(
        new InvalidScopesError(
          ['guilds.members.read', 'guilds', 'identify', 'email'],
          ['guilds'],
        ),
      );

      await expect(service.getRestClient('user-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ServiceUnavailableException when auth service is unavailable', async () => {
      authService.getIdpToken.mockRejectedValue(
        new AuthServiceUnavailableError(),
      );

      await expect(service.getRestClient('user-123')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw UnauthorizedException when required scopes are missing', async () => {
      const tokenWithMissingScopes = {
        accessToken: 'mock-access-token',
        expiresIn: 3600,
        scopes: ['guilds'], // Missing required scopes
      };
      authService.getIdpToken.mockResolvedValue(tokenWithMissingScopes);

      await expect(service.getRestClient('user-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getCacheTtl', () => {
    it('should return local TTL when in local environment', () => {
      const ttl = service['getCacheTtl'](10, 60);
      expect(ttl).toBe(10);
    });

    it('should return production TTL when in production environment', async () => {
      configService.get.mockReturnValue({
        env: RuntimeEnvironment.PROD,
      });

      // Recreate service with production config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DiscordService,
          {
            provide: AuthService,
            useValue: authService,
          },
          {
            provide: RedisService,
            useValue: redisService,
          },
          {
            provide: DiscordRateLimiterService,
            useValue: rateLimiter,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const prodService = module.get<DiscordService>(DiscordService);
      const ttl = prodService['getCacheTtl'](10, 60);
      expect(ttl).toBe(60);
    });
  });

  describe('getUserGuilds', () => {
    it('should return cached guilds if available', async () => {
      const cachedGuilds = [mockGuild];
      redisService.get.mockResolvedValue(JSON.stringify(cachedGuilds));

      const result = await service.getUserGuilds('user-123');

      expect(result).toEqual(cachedGuilds);
      expect(redisService.get).toHaveBeenCalledWith(
        'user:user-123:discord-guilds:data',
      );
      expect(authService.getIdpToken).not.toHaveBeenCalled();
    });

    it('should fetch and cache guilds if not in cache', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      // Mock REST client response
      const mockRest = {
        get: jest.fn().mockResolvedValue([mockGuild]),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);
      jest.spyOn(mockRest, 'get').mockResolvedValue([mockGuild]);

      // Mock redlock
      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      const result = await service.getUserGuilds('user-123');

      expect(result).toEqual([mockGuild]);
      expect(redisService.set).toHaveBeenCalledWith(
        'user:user-123:discord-guilds:data',
        JSON.stringify([mockGuild]),
        expect.any(Number),
      );
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should return empty array if no guilds found', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        get: jest.fn().mockResolvedValue([]),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      const result = await service.getUserGuilds('user-123');

      expect(result).toEqual([]);
      expect(service['logger'].warn).toHaveBeenCalled();
    });

    it('should cache empty array and throw on authentication error', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      await expect(service.getUserGuilds('user-123')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(redisService.set).toHaveBeenCalledWith(
        'user:user-123:discord-guilds:data',
        JSON.stringify([]),
        expect.any(Number),
      );
    });

    it('should return empty array on other errors', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        get: jest.fn().mockRejectedValue(new Error('Network error')),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      const result = await service.getUserGuilds('user-123');

      expect(result).toEqual([]);
      expect(service['logger'].error).toHaveBeenCalled();
    });

    it('should handle rate limit errors and wait exact retryAfter time', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rateLimitError = new RateLimitError({
        url: 'test',
        method: 'GET',
        hash: 'test-hash',
        limit: 10,
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 0,
        scope: 'user',
        majorParameter: 'global',
        route: '/test/route',
        timeToReset: 5000,
      });

      const mockRest = {
        get: jest.fn().mockRejectedValue(rateLimitError),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      // Mock setTimeout to avoid actual waiting in tests
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((callback: any) => {
          // Immediately call the callback to avoid waiting
          if (typeof callback === 'function') {
            callback();
          }
          return {} as any;
        });

      const result = await service.getUserGuilds('user-123');

      expect(rateLimiter.updateFromRateLimitError).toHaveBeenCalled();
      expect(service['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit hit for getUserGuilds'),
      );
      expect(service['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('5000ms'),
      );
      expect(result).toEqual([]);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('clearUserGuildIdsCache', () => {
    it('should delete cache for user guilds', async () => {
      await service.clearUserGuildIdsCache('user-123');

      expect(redisService.del).toHaveBeenCalledWith(
        'user:user-123:discord-guilds:data',
      );
    });
  });

  describe('getGuildMember', () => {
    it('should return cached member if available', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockGuildMember));

      const result = await service.getGuildMember({
        guildId: '123456',
        userId: 'user-123',
      });

      expect(result).toEqual(mockGuildMember);
      expect(redisService.get).toHaveBeenCalledWith(
        'guild:123456:member:user-123:data',
      );
      expect(authService.getIdpToken).not.toHaveBeenCalled();
    });

    it('should return null if cached value is null', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(null));

      const result = await service.getGuildMember({
        guildId: '123456',
        userId: 'user-123',
      });

      expect(result).toBeNull();
    });

    it('should fetch and cache member if not in cache', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        get: jest.fn().mockResolvedValue(mockGuildMember),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      const result = await service.getGuildMember({
        guildId: '123456',
        userId: 'user-123',
      });

      expect(result).toEqual(mockGuildMember);
      expect(redisService.set).toHaveBeenCalledWith(
        'guild:123456:member:user-123:data',
        JSON.stringify(mockGuildMember),
        expect.any(Number),
      );
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should cache null and throw NotFoundException on 404', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const notFoundError = new Error('Not found');
      (notFoundError as any).status = 404;

      const mockRest = {
        get: jest.fn().mockRejectedValue(notFoundError),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      await expect(
        service.getGuildMember({
          guildId: '123456',
          userId: 'user-123',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(redisService.set).toHaveBeenCalledWith(
        'guild:123456:member:user-123:data',
        JSON.stringify(null),
        expect.any(Number),
      );
    });

    it('should cache null and throw on authentication error', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockRejectedValue(new TokenExpiredError());

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      await expect(
        service.getGuildMember({
          guildId: '123456',
          userId: 'user-123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(redisService.set).toHaveBeenCalledWith(
        'guild:123456:member:user-123:data',
        JSON.stringify(null),
        expect.any(Number),
      );
    });

    it('should return null on other errors', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const mockRest = {
        get: jest.fn().mockRejectedValue(new Error('Network error')),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      const result = await service.getGuildMember({
        guildId: '123456',
        userId: 'user-123',
      });

      expect(result).toBeNull();
      expect(service['logger'].error).toHaveBeenCalled();
    });

    it('should handle rate limit errors and wait exact retryAfter time', async () => {
      redisService.get.mockResolvedValue(null);
      authService.getIdpToken.mockResolvedValue(mockToken);

      const rateLimitError = new RateLimitError({
        url: 'test',
        method: 'GET',
        hash: 'test-hash',
        limit: 10,
        global: false,
        retryAfter: 5000,
        sublimitTimeout: 0,
        scope: 'user',
        majorParameter: 'global',
        route: '/test/route',
        timeToReset: 5000,
      });

      const mockRest = {
        get: jest.fn().mockRejectedValue(rateLimitError),
        on: jest.fn(),
        setToken: jest.fn().mockReturnThis(),
      };
      jest.spyOn(REST.prototype, 'setToken').mockReturnValue(mockRest as any);

      const mockLock = {
        release: jest.fn().mockResolvedValue(undefined),
      };
      jest
        .spyOn(service['redlock'], 'acquire')
        .mockResolvedValue(mockLock as any);

      // Mock setTimeout to avoid actual waiting in tests
      const setTimeoutSpy = jest
        .spyOn(global, 'setTimeout')
        .mockImplementation((callback: any) => {
          // Immediately call the callback to avoid waiting
          if (typeof callback === 'function') {
            callback();
          }
          return {} as any;
        });

      const result = await service.getGuildMember({
        guildId: '123456',
        userId: 'user-123',
      });

      expect(rateLimiter.updateFromRateLimitError).toHaveBeenCalled();
      expect(service['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit hit for getGuildMember'),
      );
      expect(service['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('5000ms'),
      );
      expect(result).toBeNull();

      setTimeoutSpy.mockRestore();
    });
  });
});
