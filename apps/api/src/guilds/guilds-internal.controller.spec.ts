import { Test, type TestingModule } from '@nestjs/testing';
import { GuildsInternalController } from './guilds-internal.controller';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

describe('GuildsInternalController', () => {
  let controller: GuildsInternalController;

  const mockGuildsService = {
    getUserGuildsWithPermissions: jest.fn(),
  };

  const mockUserLootlogConfigService = {
    getLootlogAccountConfig: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuildsInternalController],
      providers: [
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
      ],
    }).compile();

    controller = module.get<GuildsInternalController>(GuildsInternalController);
  });

  it('returns empty guilds when required query params are missing', async () => {
    await expect(controller.getUserPermissions('', 'user-1')).resolves.toEqual({
      guilds: [],
    });

    expect(
      mockGuildsService.getUserGuildsWithPermissions,
    ).not.toHaveBeenCalled();
  });

  it('returns guilds without lootlog settings when account params are not provided', async () => {
    const guilds = [
      {
        guild: { id: 'guild-1', ownerId: 'owner-1' },
        roles: [],
      },
    ];

    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue(guilds);

    await expect(
      controller.getUserPermissions('discord-1', 'user-1'),
    ).resolves.toEqual({ guilds });

    expect(
      mockUserLootlogConfigService.getLootlogAccountConfig,
    ).not.toHaveBeenCalled();
  });

  it('returns guilds with per-guild lootlog settings for active character', async () => {
    const guilds = [
      {
        guild: { id: 'guild-1', ownerId: 'owner-1' },
        roles: [],
      },
      {
        guild: { id: 'guild-2', ownerId: 'owner-1' },
        roles: [],
      },
    ];

    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue(guilds);
    mockUserLootlogConfigService.getLootlogAccountConfig.mockResolvedValue({
      'char-1': {
        collectLootWhitelistGuildIds: ['guild-2'],
        addTimersWhitelistGuildIds: ['guild-1'],
      },
    });

    await expect(
      controller.getUserPermissions('discord-1', 'user-1', 'acc-1', 'char-1'),
    ).resolves.toEqual({
      guilds,
      lootlogSettings: {
        accountId: 'acc-1',
        characterId: 'char-1',
        guildStatusByGuildId: {
          'guild-1': {
            timersEnabled: true,
            lootEnabled: false,
          },
          'guild-2': {
            timersEnabled: false,
            lootEnabled: true,
          },
        },
      },
    });
  });
});
