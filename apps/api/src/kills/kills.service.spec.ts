import { Test, type TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { KillsService } from './kills.service';
import { PrismaService } from 'src/db/prisma.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { Permission, NpcType, type Role } from 'generated/client';
import type { CreateKillDto } from './dto/create-kill.dto';
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from './dto/get-kill-stats.dto';

describe('KillsService', () => {
  let service: KillsService;
  let prismaService: {
    userKillStats: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    npcKillStats: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    member: {
      findUnique: jest.Mock;
    };
  };
  let userLootlogConfigService: {
    getLootlogCharacterConfig: jest.Mock;
  };
  let logger: {
    log: jest.Mock;
    error: jest.Mock;
  };

  const mockCreateKillDto: CreateKillDto = {
    world: 'pandora',
    npc: {
      id: -12345,
      name: 'Test Boss',
      lvl: 300,
      prof: 'w',
      wt: 85,
      icon: 'boss.gif',
      type: 2,
    },
    characterId: '67890',
    accountId: '11111',
    characterName: 'TestPlayer',
    characterLvl: 500,
    characterProf: 'm',
    characterIcon: 'player.gif',
  };

  const createMockRole = (overrides: Partial<Role> = {}): Role => ({
    id: 'role1',
    name: 'Test Role',
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_LOOTS_READ],
    lvlRangeFrom: 0,
    lvlRangeTo: 500,
    guildId: 'guild1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockPrismaService = {
      userKillStats: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      npcKillStats: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      member: {
        findUnique: jest.fn(),
      },
    };

    const mockUserLootlogConfigService = {
      getLootlogCharacterConfig: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KillsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<KillsService>(KillsService);
    prismaService = module.get(PrismaService);
    userLootlogConfigService = module.get(UserLootlogConfigService);
    logger = module.get(WINSTON_MODULE_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createKill', () => {
    const discordId = 'discord123';

    it('should always save to UserKillStats', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.userKillStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_characterId_world_npcId: {
            userId: discordId,
            characterId: 67890,
            world: 'pandora',
            npcId: 12345,
          },
        },
        create: expect.objectContaining({
          userId: discordId,
          characterId: 67890,
          accountId: 11111,
          world: 'pandora',
          npcId: 12345,
          npcName: 'Test Boss',
          npcType: NpcType.HERO,
          totalKills: 1,
        }),
        update: expect.objectContaining({
          totalKills: { increment: 1 },
        }),
      });
    });

    it('should return updated: 0 when no guilds are configured', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(result).toEqual({ updated: 0 });
      expect(prismaService.npcKillStats.upsert).not.toHaveBeenCalled();
    });

    it('should save to NpcKillStats for each configured guild', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1', 'guild2'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      prismaService.npcKillStats.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.member.findUnique).toHaveBeenCalledTimes(2);
      expect(prismaService.npcKillStats.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ updated: 2 });
    });

    it('should skip guilds where member is not found', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1', 'guild2'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      prismaService.npcKillStats.upsert.mockResolvedValue({});

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.npcKillStats.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ updated: 1 });
    });

    it('should deduplicate guilds from loot and timer whitelists', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1', 'guild2'],
        addTimersWhitelistGuildIds: ['guild1', 'guild3'],
      });
      prismaService.member.findUnique.mockResolvedValue({ id: 1 });
      prismaService.npcKillStats.upsert.mockResolvedValue({});

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.member.findUnique).toHaveBeenCalledTimes(3);
    });

    it('should handle UserKillStats upsert errors gracefully', async () => {
      prismaService.userKillStats.upsert.mockRejectedValue(
        new Error('DB error'),
      );
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ updated: 0 });
    });

    it('should handle NpcKillStats upsert errors gracefully', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ['guild1'],
        addTimersWhitelistGuildIds: [],
      });
      prismaService.member.findUnique.mockResolvedValue({ id: 1 });
      prismaService.npcKillStats.upsert.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.createKill(discordId, mockCreateKillDto);

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({ updated: 0 });
    });

    it('should convert negative NPC ID to positive', async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );

      await service.createKill(discordId, mockCreateKillDto);

      expect(prismaService.userKillStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_characterId_world_npcId: expect.objectContaining({
              npcId: 12345,
            }),
          }),
        }),
      );
    });
  });

  describe('getGuildKillStats', () => {
    const guildId = 'guild123';

    const mockStats = [
      {
        memberId: 1,
        npcType: NpcType.HERO,
        npcLvl: 300,
        totalKills: 50,
        member: { name: 'Player1' },
      },
      {
        memberId: 1,
        npcType: NpcType.TITAN,
        npcLvl: 400,
        totalKills: 20,
        member: { name: 'Player1' },
      },
      {
        memberId: 2,
        npcType: NpcType.HERO,
        npcLvl: 250,
        totalKills: 30,
        member: { name: 'Player2' },
      },
    ];

    it('should return aggregated kill stats', async () => {
      prismaService.npcKillStats.findMany.mockResolvedValue(mockStats);
      const query = new GetGuildKillStatsDto();

      const result = await service.getGuildKillStats(guildId, [], [], query);

      expect(result.overview.totalKills).toBe(100);
      expect(result.overview.killsByType).toEqual({
        [NpcType.HERO]: 80,
        [NpcType.TITAN]: 20,
      });
      expect(result.memberRanking).toHaveLength(2);
      expect(result.memberRanking[0].memberName).toBe('Player1');
      expect(result.memberRanking[0].totalKills).toBe(70);
    });

    it('should filter by NPC type when provided', async () => {
      prismaService.npcKillStats.findMany.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.npcType = 'TITAN';

      await service.getGuildKillStats(guildId, [], [], query);

      expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcType: { in: ['TITAN'] },
          }),
        }),
      );
    });

    it('should filter by level range when provided', async () => {
      prismaService.npcKillStats.findMany.mockResolvedValue([]);
      const query = new GetGuildKillStatsDto();
      query.minLvl = 100;
      query.maxLvl = 300;

      await service.getGuildKillStats(guildId, [], [], query);

      expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcLvl: { gte: 100, lte: 300 },
          }),
        }),
      );
    });

    describe('permission filtering', () => {
      it('should not apply visibility filter for administrative users', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const permissions = [Permission.OWNER];

        await service.getGuildKillStats(guildId, permissions, [], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              OR: expect.anything(),
            }),
          }),
        );
      });

      it('should not apply visibility filter when no roles provided', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();

        await service.getGuildKillStats(guildId, [], [], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              OR: expect.anything(),
            }),
          }),
        );
      });

      it('should filter out TITANs when role lacks TITANS_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcType: { not: NpcType.TITAN } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it('should allow TITANs when role has TITANS_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        const andConditions = call.where.OR?.[0]?.AND || [];
        const hasTitanFilter = andConditions.some(
          (c: any) => c.npcType?.not === NpcType.TITAN,
        );
        expect(hasTitanFilter).toBe(false);
      });

      it('should filter out HEROes when role lacks HEROES_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { npcType: { notIn: [NpcType.HERO, NpcType.EVENT_HERO] } },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it('should allow HEROes when role has HEROES_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_HEROES_READ,
          ],
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        const andConditions = call.where.OR?.[0]?.AND || [];
        const hasHeroFilter = andConditions.some(
          (c: any) =>
            c.npcType?.notIn?.includes(NpcType.HERO) ||
            c.npcType?.notIn?.includes(NpcType.EVENT_HERO),
        );
        expect(hasHeroFilter).toBe(false);
      });

      it('should apply level range filter from role', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role = createMockRole({
          lvlRangeFrom: 100,
          lvlRangeTo: 300,
        });

        await service.getGuildKillStats(guildId, [], [role], query);

        expect(prismaService.npcKillStats.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { OR: [{ npcLvl: { gte: 100 } }] },
                    { OR: [{ npcLvl: { lte: 300 } }, { npcLvl: null }] },
                  ]),
                }),
              ],
            }),
          }),
        );
      });

      it('should combine visibility from multiple roles with OR', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role1 = createMockRole({
          id: 'role1',
          permissions: [Permission.LOOTLOG_LOOTS_READ],
          lvlRangeFrom: 0,
          lvlRangeTo: 200,
        });
        const role2 = createMockRole({
          id: 'role2',
          permissions: [
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_LOOTS_TITANS_READ,
          ],
          lvlRangeFrom: 200,
          lvlRangeTo: 500,
        });

        await service.getGuildKillStats(guildId, [], [role1, role2], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(2);
      });

      it('should skip roles without LOOTLOG_LOOTS_READ permission', async () => {
        prismaService.npcKillStats.findMany.mockResolvedValue([]);
        const query = new GetGuildKillStatsDto();
        const role1 = createMockRole({
          id: 'role1',
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        });
        const role2 = createMockRole({
          id: 'role2',
          permissions: [Permission.LOOTLOG_LOOTS_READ],
        });

        await service.getGuildKillStats(guildId, [], [role1, role2], query);

        const call = prismaService.npcKillStats.findMany.mock.calls[0][0];
        expect(call.where.OR).toHaveLength(1);
      });
    });
  });

  describe('getUserKillStats', () => {
    const discordId = 'discord123';

    const mockUserStats = [
      {
        characterId: 12345,
        characterName: 'MainChar',
        characterLvl: 500,
        characterProf: 'w',
        characterIcon: 'icon.gif',
        world: 'pandora',
        npcId: 999,
        npcName: 'Boss1',
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcIcon: 'boss.gif',
        totalKills: 50,
      },
      {
        characterId: 12345,
        characterName: 'MainChar',
        characterLvl: 500,
        characterProf: 'w',
        characterIcon: 'icon.gif',
        world: 'tempest',
        npcId: 888,
        npcName: 'Boss2',
        npcType: NpcType.TITAN,
        npcLvl: 400,
        npcIcon: 'titan.gif',
        totalKills: 20,
      },
      {
        characterId: 67890,
        characterName: 'AltChar',
        characterLvl: 300,
        characterProf: 'm',
        characterIcon: 'alt.gif',
        world: 'pandora',
        npcId: 999,
        npcName: 'Boss1',
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcIcon: 'boss.gif',
        totalKills: 30,
      },
    ];

    it('should return aggregated user stats', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.overview.totalKills).toBe(100);
      expect(result.overview.killsByType).toEqual({
        [NpcType.HERO]: 80,
        [NpcType.TITAN]: 20,
      });
      expect(result.overview.killsByWorld).toEqual({
        pandora: 80,
        tempest: 20,
      });
    });

    it('should group stats by character', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.characters).toHaveLength(2);
      expect(result.characters[0].characterName).toBe('MainChar');
      expect(result.characters[0].totalKills).toBe(70);
      expect(result.characters[1].characterName).toBe('AltChar');
      expect(result.characters[1].totalKills).toBe(30);
    });

    it('should return top NPCs sorted by kill count', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue(mockUserStats);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.topNpcs).toHaveLength(2);
      expect(result.topNpcs[0].npcName).toBe('Boss1');
      expect(result.topNpcs[0].totalKills).toBe(80);
    });

    it('should filter by characterId when provided', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.characterId = 12345;

      await service.getUserKillStats(discordId, query);

      expect(prismaService.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            characterId: 12345,
          }),
        }),
      );
    });

    it('should filter by world when provided', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.world = 'pandora';

      await service.getUserKillStats(discordId, query);

      expect(prismaService.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            world: 'pandora',
          }),
        }),
      );
    });

    it('should filter by NPC types when provided', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();
      query.npcType = 'HERO,TITAN';

      await service.getUserKillStats(discordId, query);

      expect(prismaService.userKillStats.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            npcType: { in: ['HERO', 'TITAN'] },
          }),
        }),
      );
    });

    it('should handle empty stats', async () => {
      prismaService.userKillStats.findMany.mockResolvedValue([]);
      const query = new GetUserKillStatsDto();

      const result = await service.getUserKillStats(discordId, query);

      expect(result.overview.totalKills).toBe(0);
      expect(result.overview.killsByType).toEqual({});
      expect(result.overview.killsByWorld).toEqual({});
      expect(result.characters).toEqual([]);
      expect(result.topNpcs).toEqual([]);
    });

    it('should limit topNpcs to 10 entries', async () => {
      const manyNpcs = Array.from({ length: 15 }, (_, i) => ({
        characterId: 12345,
        characterName: 'Char',
        characterLvl: 500,
        characterProf: 'w',
        characterIcon: 'icon.gif',
        world: 'pandora',
        npcId: 1000 + i,
        npcName: `Boss${i}`,
        npcType: NpcType.HERO,
        npcLvl: 300,
        npcIcon: 'boss.gif',
        totalKills: 100 - i,
      }));
      prismaService.userKillStats.findMany.mockResolvedValue(manyNpcs);
      const query = new GetUserKillStatsDto();
      query.topNpcsLimit = 10;

      const result = await service.getUserKillStats(discordId, query);

      expect(result.topNpcs).toHaveLength(10);
      expect(result.topNpcs[0].totalKills).toBe(100);
      expect(result.topNpcs[9].totalKills).toBe(91);
    });
  });
});
