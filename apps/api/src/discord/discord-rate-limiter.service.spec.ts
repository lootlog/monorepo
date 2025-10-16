import { Test, TestingModule } from '@nestjs/testing';
import { DiscordRateLimiterService } from './discord-rate-limiter.service';
import { RedisService } from 'src/lib/redis/redis.service';

describe('DiscordRateLimiterService', () => {
  let service: DiscordRateLimiterService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordRateLimiterService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<DiscordRateLimiterService>(
      DiscordRateLimiterService,
    );
    redisService = module.get(RedisService);

    // Suppress logger output
    jest.spyOn(service['logger'], 'warn').mockImplementation();
    jest.spyOn(service['logger'], 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return immediately if no rate limit data exists', async () => {
      redisService.get.mockResolvedValue(null);

      await service.checkRateLimit('test-bucket');

      expect(redisService.get).toHaveBeenCalledWith(
        'discord:ratelimit:test-bucket',
      );
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should delete expired rate limit data', async () => {
      const expiredData = {
        remaining: 5,
        reset: Date.now() - 1000,
        limit: 10,
        bucket: 'test-bucket',
      };
      redisService.get.mockResolvedValue(JSON.stringify(expiredData));

      await service.checkRateLimit('test-bucket');

      expect(redisService.del).toHaveBeenCalledWith(
        'discord:ratelimit:test-bucket',
      );
    });

    it('should wait when rate limit is exceeded', async () => {
      const reset = Date.now() + 1000;
      const rateLimitData = {
        remaining: 0,
        reset,
        limit: 10,
        bucket: 'test-bucket',
      };
      redisService.get.mockResolvedValue(JSON.stringify(rateLimitData));

      const sleepSpy = jest
        .spyOn(service as any, 'sleep')
        .mockResolvedValue(undefined);

      await service.checkRateLimit('test-bucket');

      expect(sleepSpy).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith(
        'discord:ratelimit:test-bucket',
      );
    });

    it('should log warning when rate limit is low', async () => {
      const reset = Date.now() + 5000;
      const rateLimitData = {
        remaining: 2,
        reset,
        limit: 10,
        bucket: 'test-bucket',
      };
      redisService.get.mockResolvedValue(JSON.stringify(rateLimitData));

      await service.checkRateLimit('test-bucket');

      expect(service['logger'].debug).toHaveBeenCalled();
    });

    it('should include user ID in bucket key when provided', async () => {
      redisService.get.mockResolvedValue(null);

      await service.checkRateLimit('test-bucket', 'user-123');

      expect(redisService.get).toHaveBeenCalledWith(
        'discord:ratelimit:test-bucket:user:user-123',
      );
    });

    it('should include top-level resource in bucket key when provided', async () => {
      redisService.get.mockResolvedValue(null);

      await service.checkRateLimit(
        'test-bucket',
        'user-123',
        'guild:123456',
      );

      expect(redisService.get).toHaveBeenCalledWith(
        'discord:ratelimit:test-bucket:user:user-123:guild:123456',
      );
    });
  });

  describe('checkRateLimitForPath', () => {
    it('should check rate limit if bucket is cached', async () => {
      const path = '/guilds/123456/members/@me';
      service['pathToBucketCache'].set('/guilds/{guild.id}/members/@me', {
        bucket: 'cached-bucket',
        scope: 'user',
      });
      redisService.get.mockResolvedValue(null);

      await service.checkRateLimitForPath(path, 'user-123');

      expect(redisService.get).toHaveBeenCalledWith(
        'discord:ratelimit:cached-bucket:user:user-123:guild:123456',
      );
    });

    it('should not check rate limit if bucket is not cached', async () => {
      const path = '/guilds/123456/members/@me';

      await service.checkRateLimitForPath(path, 'user-123');

      expect(redisService.get).not.toHaveBeenCalled();
    });
  });

  describe('updateFromHeaders', () => {
    it('should return early if bucket header is missing', async () => {
      const headers = {
        'x-ratelimit-bucket': null,
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': '1234567890.123',
      };

      await service.updateFromHeaders('/test/path', headers);

      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should return early if limit is 0', async () => {
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '0',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': '1234567890.123',
      };

      await service.updateFromHeaders('/test/path', headers);

      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should return early if both reset and reset-after are 0', async () => {
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': '0',
        'x-ratelimit-reset-after': '0',
      };

      await service.updateFromHeaders('/test/path', headers);

      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should return early if reset time has already passed', async () => {
      const pastTimestamp = (Date.now() - 1000) / 1000;
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': pastTimestamp.toString(),
      };

      await service.updateFromHeaders('/test/path', headers);

      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should update rate limit data with valid headers', async () => {
      const resetTimestamp = (Date.now() + 60000) / 1000; // 60 seconds in the future
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': resetTimestamp.toString(),
        'x-ratelimit-scope': null,
        'x-ratelimit-global': null,
      };

      await service.updateFromHeaders('/test/path', headers);

      expect(redisService.set).toHaveBeenCalled();
      const [key, data, ttl] = redisService.set.mock.calls[0];
      expect(key).toBe('discord:ratelimit:test-bucket');
      const parsedData = JSON.parse(data as string);
      expect(parsedData.remaining).toBe(5);
      expect(parsedData.limit).toBe(10);
      expect(parsedData.bucket).toBe('test-bucket');
      expect(ttl).toBeGreaterThan(0);
    });

    it('should cache the path to bucket mapping', async () => {
      const resetTimestamp = (Date.now() + 60000) / 1000;
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': resetTimestamp.toString(),
        'x-ratelimit-scope': null,
        'x-ratelimit-global': null,
      };

      await service.updateFromHeaders('/guilds/123456/members', headers);

      expect(
        service['pathToBucketCache'].get('/guilds/{guild.id}/members'),
      ).toEqual({
        bucket: 'test-bucket',
        scope: undefined,
      });
    });

    it('should include user ID in key when provided', async () => {
      const resetTimestamp = (Date.now() + 60000) / 1000;
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': resetTimestamp.toString(),
        'x-ratelimit-scope': null,
        'x-ratelimit-global': null,
      };

      await service.updateFromHeaders('/test/path', headers, 'user-123');

      const [key] = redisService.set.mock.calls[0];
      expect(key).toBe('discord:ratelimit:test-bucket:user:user-123');
    });

    it('should extract and include top-level resource in key', async () => {
      const resetTimestamp = (Date.now() + 60000) / 1000;
      const headers = {
        'x-ratelimit-bucket': 'test-bucket',
        'x-ratelimit-limit': '10',
        'x-ratelimit-remaining': '5',
        'x-ratelimit-reset': resetTimestamp.toString(),
        'x-ratelimit-scope': null,
        'x-ratelimit-global': null,
      };

      await service.updateFromHeaders(
        '/guilds/123456/members',
        headers,
        'user-123',
      );

      const [key] = redisService.set.mock.calls[0];
      expect(key).toBe(
        'discord:ratelimit:test-bucket:user:user-123:guild:123456',
      );
    });

    describe('X-RateLimit-Reset-After support', () => {
      it('should prefer reset-after over reset when both are present', async () => {
        const now = Date.now();
        const resetTimestamp = (now + 60000) / 1000; // 60 seconds
        const resetAfter = 30; // 30 seconds
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': resetTimestamp.toString(),
          'x-ratelimit-reset-after': resetAfter.toString(),
          'x-ratelimit-scope': null,
          'x-ratelimit-global': null,
        };

        await service.updateFromHeaders('/test/path', headers);

        expect(redisService.set).toHaveBeenCalled();
        const [, data] = redisService.set.mock.calls[0];
        const parsedData = JSON.parse(data as string);
        // Reset should be calculated from reset-after (now + 30s) not from reset timestamp
        const expectedReset = now + resetAfter * 1000;
        expect(parsedData.reset).toBeGreaterThanOrEqual(expectedReset - 100);
        expect(parsedData.reset).toBeLessThanOrEqual(expectedReset + 100);
      });

      it('should use reset-after with decimal precision', async () => {
        const now = Date.now();
        const resetAfter = 5.5; // 5.5 seconds (5500ms)
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': '0',
          'x-ratelimit-reset-after': resetAfter.toString(),
          'x-ratelimit-scope': null,
          'x-ratelimit-global': null,
        };

        await service.updateFromHeaders('/test/path', headers);

        expect(redisService.set).toHaveBeenCalled();
        const [, data, ttl] = redisService.set.mock.calls[0];
        const parsedData = JSON.parse(data as string);
        const expectedReset = now + resetAfter * 1000;
        expect(parsedData.reset).toBeGreaterThanOrEqual(expectedReset - 100);
        expect(parsedData.reset).toBeLessThanOrEqual(expectedReset + 100);
        expect(ttl).toBeGreaterThanOrEqual(5);
        expect(ttl).toBeLessThanOrEqual(6);
      });

      it('should fall back to reset when reset-after is not provided', async () => {
        const resetTimestamp = (Date.now() + 60000) / 1000;
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': resetTimestamp.toString(),
          'x-ratelimit-reset-after': '0',
          'x-ratelimit-scope': null,
          'x-ratelimit-global': null,
        };

        await service.updateFromHeaders('/test/path', headers);

        expect(redisService.set).toHaveBeenCalled();
        const [, data] = redisService.set.mock.calls[0];
        const parsedData = JSON.parse(data as string);
        expect(parsedData.reset).toBe(Math.floor(resetTimestamp * 1000));
      });

      it('should fall back to reset when reset-after is null', async () => {
        const resetTimestamp = (Date.now() + 60000) / 1000;
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': resetTimestamp.toString(),
          'x-ratelimit-reset-after': null,
          'x-ratelimit-scope': null,
          'x-ratelimit-global': null,
        };

        await service.updateFromHeaders('/test/path', headers);

        expect(redisService.set).toHaveBeenCalled();
        const [, data] = redisService.set.mock.calls[0];
        const parsedData = JSON.parse(data as string);
        expect(parsedData.reset).toBe(Math.floor(resetTimestamp * 1000));
      });
    });
  });

  describe('updateFromRateLimitError', () => {
    it('should update rate limit data from error', async () => {
      const error = {
        retryAfter: 5000,
        limit: 10,
        hash: 'error-bucket',
      };

      await service.updateFromRateLimitError('/test/path', error);

      expect(redisService.set).toHaveBeenCalled();
      const [key, data, ttl] = redisService.set.mock.calls[0];
      expect(key).toBe('discord:ratelimit:error-bucket');
      const parsedData = JSON.parse(data as string);
      expect(parsedData.remaining).toBe(0);
      expect(parsedData.limit).toBe(10);
      expect(parsedData.bucket).toBe('error-bucket');
      expect(ttl).toBeGreaterThan(0);
    });

    it('should cache the path to bucket mapping', async () => {
      const error = {
        retryAfter: 5000,
        limit: 10,
        hash: 'error-bucket',
      };

      await service.updateFromRateLimitError('/guilds/123456/members', error);

      expect(
        service['pathToBucketCache'].get('/guilds/{guild.id}/members'),
      ).toEqual({
        bucket: 'error-bucket',
        scope: undefined,
      });
    });

    it('should include user ID in key when provided', async () => {
      const error = {
        retryAfter: 5000,
        limit: 10,
        hash: 'error-bucket',
      };

      await service.updateFromRateLimitError(
        '/test/path',
        error,
        'user-123',
      );

      const [key] = redisService.set.mock.calls[0];
      expect(key).toBe('discord:ratelimit:error-bucket:user:user-123');
    });

    it('should extract and include top-level resource in key', async () => {
      const error = {
        retryAfter: 5000,
        limit: 10,
        hash: 'error-bucket',
      };

      await service.updateFromRateLimitError(
        '/guilds/123456/members',
        error,
        'user-123',
      );

      const [key] = redisService.set.mock.calls[0];
      expect(key).toBe(
        'discord:ratelimit:error-bucket:user:user-123:guild:123456',
      );
    });

    it('should use "unknown" as bucket if hash is missing', async () => {
      const error = {
        retryAfter: 5000,
        limit: 10,
        hash: '',
      };

      await service.updateFromRateLimitError('/test/path', error);

      const [key] = redisService.set.mock.calls[0];
      expect(key).toBe('discord:ratelimit:unknown');
    });
  });

  describe('normalizePath', () => {
    it('should normalize guild ID in path', () => {
      const result = service['normalizePath']('/guilds/123456/members');
      expect(result).toBe('/guilds/{guild.id}/members');
    });

    it('should normalize channel ID in path', () => {
      const result = service['normalizePath']('/channels/789012/messages');
      expect(result).toBe('/channels/{channel.id}/messages');
    });

    it('should normalize webhook ID in path', () => {
      const result = service['normalizePath']('/webhooks/345678');
      expect(result).toBe('/webhooks/{webhook.id}');
    });

    it('should normalize user ID in path', () => {
      const result = service['normalizePath']('/users/901234');
      expect(result).toBe('/users/{user.id}');
    });

    it('should normalize multiple IDs in path', () => {
      const result = service['normalizePath'](
        '/guilds/123456/channels/789012',
      );
      expect(result).toBe('/guilds/{guild.id}/channels/{channel.id}');
    });

    it('should not modify path without IDs', () => {
      const result = service['normalizePath']('/users/@me/guilds');
      expect(result).toBe('/users/@me/guilds');
    });
  });

  describe('extractTopLevelResource', () => {
    it('should return undefined for user guilds endpoint', () => {
      const result = service.extractTopLevelResource('/users/@me/guilds');
      expect(result).toBeUndefined();
    });

    it('should extract guild ID', () => {
      const result = service.extractTopLevelResource(
        '/guilds/123456/members',
      );
      expect(result).toBe('guild:123456');
    });

    it('should extract channel ID', () => {
      const result = service.extractTopLevelResource(
        '/channels/789012/messages',
      );
      expect(result).toBe('channel:789012');
    });

    it('should extract webhook ID', () => {
      const result = service.extractTopLevelResource('/webhooks/345678');
      expect(result).toBe('webhook:345678');
    });

    it('should prioritize guild ID over channel ID', () => {
      const result = service.extractTopLevelResource(
        '/guilds/123456/channels/789012',
      );
      expect(result).toBe('guild:123456');
    });

    it('should return undefined for paths without resource IDs', () => {
      const result = service.extractTopLevelResource('/test/path');
      expect(result).toBeUndefined();
    });
  });

  describe('getBucketKey', () => {
    it('should generate key with bucket only', () => {
      const result = service['getBucketKey']('test-bucket');
      expect(result).toBe('discord:ratelimit:test-bucket');
    });

    it('should generate key with bucket and user ID', () => {
      const result = service['getBucketKey']('test-bucket', 'user-123');
      expect(result).toBe('discord:ratelimit:test-bucket:user:user-123');
    });

    it('should generate key with bucket and resource', () => {
      const result = service['getBucketKey'](
        'test-bucket',
        undefined,
        'guild:123456',
      );
      expect(result).toBe('discord:ratelimit:test-bucket:guild:123456');
    });

    it('should generate key with all parameters', () => {
      const result = service['getBucketKey'](
        'test-bucket',
        'user-123',
        'guild:123456',
      );
      expect(result).toBe(
        'discord:ratelimit:test-bucket:user:user-123:guild:123456',
      );
    });

    describe('with scope parameter', () => {
      it('should generate global scope key without user or resource', () => {
        const result = service['getBucketKey'](
          'test-bucket',
          'user-123',
          'guild:123456',
          'global',
        );
        expect(result).toBe('discord:ratelimit:test-bucket:global');
      });

      it('should generate shared scope key with resource', () => {
        const result = service['getBucketKey'](
          'test-bucket',
          'user-123',
          'guild:123456',
          'shared',
        );
        expect(result).toBe('discord:ratelimit:test-bucket:shared:guild:123456');
      });

      it('should generate shared scope key without resource', () => {
        const result = service['getBucketKey'](
          'test-bucket',
          undefined,
          undefined,
          'shared',
        );
        expect(result).toBe('discord:ratelimit:test-bucket:shared');
      });

      it('should generate user scope key with user ID and resource', () => {
        const result = service['getBucketKey'](
          'test-bucket',
          'user-123',
          'guild:123456',
          'user',
        );
        expect(result).toBe(
          'discord:ratelimit:test-bucket:user:user-123:guild:123456',
        );
      });

      it('should generate user scope key with user ID only', () => {
        const result = service['getBucketKey'](
          'test-bucket',
          'user-123',
          undefined,
          'user',
        );
        expect(result).toBe('discord:ratelimit:test-bucket:user:user-123');
      });

      it('should fallback to unknown when user scope but no userId', () => {
        const result = service['getBucketKey'](
          'test-bucket',
          undefined,
          undefined,
          'user',
        );
        expect(result).toBe('discord:ratelimit:test-bucket:user:unknown');
      });
    });

    describe('scope handling with updateFromHeaders', () => {
      it('should use user scope when provided', async () => {
        const resetTimestamp = (Date.now() + 60000) / 1000;
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': resetTimestamp.toString(),
          'x-ratelimit-scope': 'user',
          'x-ratelimit-global': null,
        };

        await service.updateFromHeaders('/test/path', headers, 'user-123');

        const [key] = redisService.set.mock.calls[0];
        expect(key).toBe('discord:ratelimit:test-bucket:user:user-123');
      });

      it('should use shared scope when provided', async () => {
        const resetTimestamp = (Date.now() + 60000) / 1000;
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': resetTimestamp.toString(),
          'x-ratelimit-scope': 'shared',
          'x-ratelimit-global': null,
        };

        await service.updateFromHeaders(
          '/guilds/123456/members',
          headers,
          'user-123',
        );

        const [key] = redisService.set.mock.calls[0];
        expect(key).toBe('discord:ratelimit:test-bucket:shared:guild:123456');
      });

      it('should use global scope when provided', async () => {
        const resetTimestamp = (Date.now() + 60000) / 1000;
        const headers = {
          'x-ratelimit-bucket': 'test-bucket',
          'x-ratelimit-limit': '10',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': resetTimestamp.toString(),
          'x-ratelimit-scope': 'global',
          'x-ratelimit-global': 'true',
        };

        await service.updateFromHeaders('/test/path', headers, 'user-123');

        const [key] = redisService.set.mock.calls[0];
        expect(key).toBe('discord:ratelimit:test-bucket:global');
      });
    });
  });
});
