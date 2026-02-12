import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { GuildsService } from 'src/guilds/guilds.service';
import { HttpService } from '@nestjs/axios';
import { RedisService } from 'src/lib/redis/redis.service';

describe('GuildsService', () => {
  const mockHttpService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<HttpService>;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
  } as unknown as jest.Mocked<RedisService>;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      url: 'http://api.local',
    }),
  } as unknown as jest.Mocked<ConfigService>;

  let service: GuildsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new GuildsService(
      mockHttpService,
      mockRedisService,
      mockConfigService,
    );
  });

  it('normalizes legacy array response from API', async () => {
    const guilds = [
      {
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
        },
        roles: [],
      },
    ];

    mockRedisService.get.mockResolvedValue(null);
    mockHttpService.get.mockReturnValue(
      of({
        data: guilds,
      }) as never,
    );

    await expect(
      service.getUserGuilds({
        discordId: 'discord-1',
        userId: 'user-1',
      }),
    ).resolves.toEqual({
      guilds,
    });
  });

  it('normalizes object response and includes account/character params', async () => {
    const guilds = [
      {
        guild: {
          id: 'guild-1',
          ownerId: 'owner-1',
        },
        roles: [],
      },
    ];

    const lootlogSettings = {
      accountId: 'acc-1',
      characterId: 'char-1',
      guildStatusByGuildId: {
        'guild-1': {
          timersEnabled: true,
          lootEnabled: false,
        },
      },
    };

    mockRedisService.get.mockResolvedValue(null);
    mockHttpService.get.mockReturnValue(
      of({
        data: {
          guilds,
          lootlogSettings,
        },
      }) as never,
    );

    await expect(
      service.getUserGuilds({
        discordId: 'discord-1',
        userId: 'user-1',
        accountId: 'acc-1',
        characterId: 'char-1',
      }),
    ).resolves.toEqual({
      guilds,
      lootlogSettings,
    });

    expect(mockHttpService.get).toHaveBeenCalledWith(
      'http://api.local/internal/guilds/user-permissions',
      expect.objectContaining({
        params: expect.objectContaining({
          discordId: 'discord-1',
          userId: 'user-1',
          accountId: 'acc-1',
          characterId: 'char-1',
        }),
      }),
    );
  });

  it('uses separate cache keys for different account/character combinations', async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockHttpService.get.mockReturnValue(
      of({
        data: [],
      }) as never,
    );

    await service.getUserGuilds({
      discordId: 'discord-1',
      userId: 'user-1',
      accountId: 'acc-1',
      characterId: 'char-1',
    });

    await service.getUserGuilds({
      discordId: 'discord-1',
      userId: 'user-1',
      accountId: 'acc-1',
      characterId: 'char-2',
    });

    const cacheKeys = mockRedisService.get.mock.calls.map((call) => call[0]);

    expect(cacheKeys.length).toBeGreaterThanOrEqual(2);
    expect(cacheKeys[0]).not.toEqual(cacheKeys[1]);
    expect(cacheKeys[0]).toContain('char-1');
    expect(cacheKeys[1]).toContain('char-2');
  });
});
