import { Test, type TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { KillsController } from './kills.controller';
import { KillsService } from './kills.service';
import { CreateKillDto } from './dto/create-kill.dto';
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from './dto/get-kill-stats.dto';
import {
  CreateKillResponseEntity,
  GuildKillStatsEntity,
  UserKillStatsEntity,
} from './entities/kill-stats.entity';
import { Permission, NpcType, type Role } from 'generated/client';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

describe('KillsController', () => {
  let controller: KillsController;
  let service: {
    createKill: jest.Mock;
    getGuildKillStats: jest.Mock;
    getUserKillStats: jest.Mock;
  };

  const mockRole: Role = {
    id: 'role1',
    name: 'Test Role',
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_LOOTS_READ],
    lvlRangeFrom: 1,
    lvlRangeTo: 500,
    guildId: 'guild1',
    createdAt: new Date(),
    updatedAt: new Date(),
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

  beforeEach(async () => {
    const mockKillsService = {
      createKill: jest.fn(),
      getGuildKillStats: jest.fn(),
      getUserKillStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KillsController],
      providers: [{ provide: KillsService, useValue: mockKillsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KillsController>(KillsController);
    service = module.get(KillsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('createKill', () => {
    const discordId = 'discord123';

    it('should create a kill and return the result', async () => {
      const mockResult = { updated: 2 };
      service.createKill.mockResolvedValue(mockResult);

      const result = await controller.createKill(mockCreateKillDto, discordId);

      expect(service.createKill).toHaveBeenCalledWith(
        discordId,
        mockCreateKillDto,
      );
      expect(result).toEqual(
        plainToInstance(CreateKillResponseEntity, mockResult),
      );
    });

    it('should return updated: 0 when no guilds are configured', async () => {
      const mockResult = { updated: 0 };
      service.createKill.mockResolvedValue(mockResult);

      const result = await controller.createKill(mockCreateKillDto, discordId);

      expect(result).toEqual(
        plainToInstance(CreateKillResponseEntity, mockResult),
      );
    });

    it('should handle service errors', async () => {
      service.createKill.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.createKill(mockCreateKillDto, discordId),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getGuildKillStats', () => {
    const guildId = 'guild123';
    const permissions = [Permission.LOOTLOG_LOOTS_READ];
    const roles = [mockRole];

    it('should fetch guild kill stats', async () => {
      const mockStats = {
        overview: {
          totalKills: 100,
          killsByType: {
            [NpcType.HERO]: 50,
            [NpcType.TITAN]: 30,
            [NpcType.ELITE3]: 20,
          },
        },
        memberRanking: [
          {
            memberId: 1,
            memberName: 'Player1',
            totalKills: 60,
            killsByType: {
              [NpcType.HERO]: 30,
              [NpcType.TITAN]: 20,
              [NpcType.ELITE3]: 10,
            },
          },
          {
            memberId: 2,
            memberName: 'Player2',
            totalKills: 40,
            killsByType: {
              [NpcType.HERO]: 20,
              [NpcType.TITAN]: 10,
              [NpcType.ELITE3]: 10,
            },
          },
        ],
      };
      service.getGuildKillStats.mockResolvedValue(mockStats);

      const query = new GetGuildKillStatsDto();
      const result = await controller.getGuildKillStats(
        permissions,
        roles,
        guildId,
        query,
      );

      expect(service.getGuildKillStats).toHaveBeenCalledWith(
        guildId,
        permissions,
        roles,
        query,
      );
      expect(result).toEqual(plainToInstance(GuildKillStatsEntity, mockStats));
    });

    it('should handle empty results', async () => {
      const mockStats = {
        overview: {
          totalKills: 0,
          killsByType: {},
        },
        memberRanking: [],
      };
      service.getGuildKillStats.mockResolvedValue(mockStats);

      const query = new GetGuildKillStatsDto();
      const result = await controller.getGuildKillStats(
        permissions,
        roles,
        guildId,
        query,
      );

      expect(result).toEqual(plainToInstance(GuildKillStatsEntity, mockStats));
    });

    it('should pass query filters to service', async () => {
      const mockStats = {
        overview: { totalKills: 10, killsByType: { [NpcType.TITAN]: 10 } },
        memberRanking: [],
      };
      service.getGuildKillStats.mockResolvedValue(mockStats);

      const query = new GetGuildKillStatsDto();
      query.npcType = 'TITAN';
      query.minLvl = 200;
      query.maxLvl = 400;

      await controller.getGuildKillStats(permissions, roles, guildId, query);

      expect(service.getGuildKillStats).toHaveBeenCalledWith(
        guildId,
        permissions,
        roles,
        query,
      );
    });
  });

  describe('getUserKillStats', () => {
    const discordId = 'discord123';

    it('should fetch user kill stats', async () => {
      const mockStats = {
        overview: {
          totalKills: 200,
          killsByType: {
            [NpcType.HERO]: 100,
            [NpcType.TITAN]: 50,
            [NpcType.ELITE3]: 50,
          },
          killsByWorld: { pandora: 150, tempest: 50 },
        },
        characters: [
          {
            characterId: 12345,
            characterName: 'MainChar',
            characterLvl: 500,
            characterProf: 'w',
            characterIcon: 'icon.gif',
            totalKills: 150,
            killsByType: {
              [NpcType.HERO]: 80,
              [NpcType.TITAN]: 40,
              [NpcType.ELITE3]: 30,
            },
          },
        ],
        topNpcs: [
          {
            npcId: 999,
            npcName: 'Popular Boss',
            npcType: NpcType.HERO,
            npcLvl: 300,
            npcIcon: 'boss.gif',
            totalKills: 25,
          },
        ],
      };
      service.getUserKillStats.mockResolvedValue(mockStats);

      const query = new GetUserKillStatsDto();
      const result = await controller.getUserKillStats(discordId, query);

      expect(service.getUserKillStats).toHaveBeenCalledWith(discordId, query);
      expect(result).toEqual(plainToInstance(UserKillStatsEntity, mockStats));
    });

    it('should handle empty user stats', async () => {
      const mockStats = {
        overview: {
          totalKills: 0,
          killsByType: {},
          killsByWorld: {},
        },
        characters: [],
        topNpcs: [],
      };
      service.getUserKillStats.mockResolvedValue(mockStats);

      const query = new GetUserKillStatsDto();
      const result = await controller.getUserKillStats(discordId, query);

      expect(result).toEqual(plainToInstance(UserKillStatsEntity, mockStats));
    });

    it('should pass query filters to service', async () => {
      const mockStats = {
        overview: { totalKills: 0, killsByType: {}, killsByWorld: {} },
        characters: [],
        topNpcs: [],
      };
      service.getUserKillStats.mockResolvedValue(mockStats);

      const query = new GetUserKillStatsDto();
      query.characterId = 12345;
      query.world = 'pandora';
      query.npcType = 'HERO,TITAN';

      await controller.getUserKillStats(discordId, query);

      expect(service.getUserKillStats).toHaveBeenCalledWith(discordId, query);
    });
  });
});
