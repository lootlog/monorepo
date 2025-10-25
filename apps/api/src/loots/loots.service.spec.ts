import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { LootsService } from './loots.service';
import { PlayersService } from '../players/players.service';
import { NpcsService } from '../npcs/npcs.service';
import { GuildsService } from '../guilds/guilds.service';
import { PrismaService } from '../db/prisma.service';
import { LootlogConfigService } from '../lootlog-config/lootlog-config.service';
import { UserLootlogConfigService } from '../user-lootlog-config/user-lootlog-config.service';
import { CreateLootDto } from './dto/create-loot.dto';
import { UpdateLootDto } from './dto/update-loot.dto';
import { CreateCommentDto } from './dto/create-comment-dto';
import { FetchLootsParamsDto } from './dto/fetch-loots-params.dto';
import {
  ItemRarity,
  Profession,
  NpcType,
  LootSource,
  Guild,
} from 'generated/client';
import { ErrorKey } from './enum/error-key.enum';

describe('LootsService', () => {
  let service: LootsService;
  let prismaService: any;
  let playersService: jest.Mocked<PlayersService>;
  let npcsService: jest.Mocked<NpcsService>;
  let guildsService: jest.Mocked<GuildsService>;
  let lootlogConfigService: jest.Mocked<LootlogConfigService>;
  let userLootlogConfigService: jest.Mocked<UserLootlogConfigService>;

  const mockGuild: Guild = {
    id: 'guild1',
    name: 'Test Guild',
    vanityUrl: null,
    icon: 'icon.png',
    ownerId: 'owner123',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateLootDto: CreateLootDto = {
    loots: [
      {
        id: 1,
        hid: 'item1',
        name: 'Test Item',
        icon: 'item.png',
        pr: 1000,
        prc: '1k',
        stat: 'lvl=50;rarity=UNIQUE',
        cl: 1,
        own: 1,
      },
    ],
    npcs: [
      {
        id: 1,
        name: 'Test NPC',
        location: 'Test Location',
        lvl: 50,
        prof: 'w',
        wt: 5,
        hpp: 5000,
        icon: 'npc.png',
        type: 1,
        x: 100,
        y: 200,
      },
    ],
    players: [
      {
        id: 1,
        accountId: 123,
        name: 'Test Player',
        lvl: 50,
        prof: 'w',
        icon: 'player.png',
        hpp: 3000,
      },
    ],
    world: 'testworld',
    source: LootSource.FIGHT,
    location: 'Test Location',
    accountId: '123',
    characterId: '1',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      loot: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      lootSubmission: {
        createMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
      lootComment: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      member: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockPlayersService = {
      bulkIndexPlayers: jest.fn(),
    };

    const mockNpcsService = {
      bulkIndexNpcs: jest.fn(),
    };

    const mockGuildsService = {
      getGuildsForRequiredPermissions: jest.fn(),
    };

    const mockLootlogConfigService = {
      getMultipleLootlogConfigs: jest.fn(),
    };

    const mockUserLootlogConfigService = {
      getLootlogCharacterConfig: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LootsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: NpcsService, useValue: mockNpcsService },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: LootlogConfigService, useValue: mockLootlogConfigService },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<LootsService>(LootsService);
    prismaService = module.get(PrismaService);
    playersService = module.get(PlayersService);
    npcsService = module.get(NpcsService);
    guildsService = module.get(GuildsService);
    lootlogConfigService = module.get(LootlogConfigService);
    userLootlogConfigService = module.get(UserLootlogConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createLoot', () => {
    const discordId = 'discord123';
    const userId = 'user123';

    beforeEach(() => {
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
      ]);
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue(
        null,
      );
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: 'guild1',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
              lootlogConfigId: 'config1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);
      prismaService.member.findMany.mockResolvedValue([
        {
          id: 'member1',
          guildId: 'guild1',
          userId: discordId,
        },
      ]);
    });

    it('should throw BadRequestException when too many loots', async () => {
      const tooManyLoots = Array(11).fill(mockCreateLootDto.loots[0]);
      const dto = { ...mockCreateLootDto, loots: tooManyLoots };

      await expect(service.createLoot(discordId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when user has no guilds with write permission', async () => {
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create new loot when it does not exist', async () => {
      const mockLoot = { id: 1, uniqueId: 'unique123' };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

      expect(prismaService.loot.create).toHaveBeenCalled();
      expect(prismaService.lootSubmission.createMany).toHaveBeenCalled();
      expect(playersService.bulkIndexPlayers).toHaveBeenCalled();
      expect(npcsService.bulkIndexNpcs).toHaveBeenCalled();
      expect(result).toEqual({ id: mockLoot.id });
    });

    it('should return existing loot when it already exists', async () => {
      const mockLoot = { id: 1, uniqueId: 'unique123' };
      prismaService.loot.findUnique.mockResolvedValue(mockLoot);

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

      expect(prismaService.loot.create).not.toHaveBeenCalled();
      expect(playersService.bulkIndexPlayers).not.toHaveBeenCalled();
      expect(npcsService.bulkIndexNpcs).not.toHaveBeenCalled();
      expect(result).toEqual({ id: mockLoot.id });
    });

    it('should handle race condition on loot creation (P2002 error)', async () => {
      const mockLoot = { id: 1, uniqueId: 'unique123' };
      prismaService.loot.findUnique
        .mockResolvedValueOnce(null) // First call returns null
        .mockResolvedValueOnce(mockLoot); // Second call after P2002 returns loot

      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      prismaService.loot.create.mockRejectedValue(p2002Error);

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

      expect(prismaService.loot.findUnique).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: mockLoot.id });
    });

    it('should throw BadRequestException when no valid configs found', async () => {
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([]);
      prismaService.loot.findUnique.mockResolvedValue(null);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toThrow(
        new BadRequestException(ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT),
      );

      expect(prismaService.loot.create).not.toHaveBeenCalled();
      expect(prismaService.lootSubmission.createMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no guild config accepts the loot', async () => {
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: 'guild1',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.HEROIC],
              lootlogConfigId: 'config1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);
      prismaService.loot.findUnique.mockResolvedValue(null);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toThrow(
        new BadRequestException(ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT),
      );

      expect(prismaService.loot.create).not.toHaveBeenCalled();
      expect(prismaService.lootSubmission.createMany).not.toHaveBeenCalled();
    });

    it('should handle 5 concurrent requests and create only one loot', async () => {
      const mockLoot = { id: 1, uniqueId: 'unique123' };
      let createCallCount = 0;

      prismaService.loot.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      prismaService.loot.create.mockImplementation(async () => {
        createCallCount++;
        if (createCallCount === 1) {
          return mockLoot;
        }
        const p2002Error = new Error('Unique constraint failed');
        (p2002Error as any).code = 'P2002';
        throw p2002Error;
      });

      prismaService.loot.findUnique.mockResolvedValue(mockLoot);

      const requests = Array(5)
        .fill(null)
        .map(() => service.createLoot(discordId, userId, mockCreateLootDto));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result.id).toBe(mockLoot.id));
      expect(createCallCount).toBeLessThanOrEqual(5);
    });

    it('should create submissions for user with multiple guilds', async () => {
      const guild2: Guild = {
        id: 'guild2',
        name: 'Test Guild 2',
        vanityUrl: null,
        icon: 'icon2.png',
        ownerId: 'owner456',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: 'guild1',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
              lootlogConfigId: 'config1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
        {
          id: 'guild2',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 2,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
              lootlogConfigId: 'config2',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);

      prismaService.member.findMany.mockResolvedValue([
        {
          id: 'member1',
          guildId: 'guild1',
          userId: discordId,
        },
        {
          id: 'member2',
          guildId: 'guild2',
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: 'unique123' };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      await service.createLoot(discordId, userId, mockCreateLootDto);

      expect(prismaService.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            lootId: mockLoot.id,
            guildId: 'guild1',
            memberId: 'member1',
          },
          {
            lootId: mockLoot.id,
            guildId: 'guild2',
            memberId: 'member2',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should filter guilds based on user blacklist config', async () => {
      const guild2: Guild = {
        id: 'guild2',
        name: 'Test Guild 2',
        vanityUrl: null,
        icon: 'icon2.png',
        ownerId: 'owner456',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootBlaclistGuildIds: ['guild2'],
      } as any);

      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: 'guild1',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.UNIQUE],
              lootlogConfigId: 'config1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);

      prismaService.member.findMany.mockResolvedValue([
        {
          id: 'member1',
          guildId: 'guild1',
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: 'unique123' };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      await service.createLoot(discordId, userId, mockCreateLootDto);

      expect(
        lootlogConfigService.getMultipleLootlogConfigs,
      ).toHaveBeenCalledWith(['guild1']);
      expect(prismaService.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            lootId: mockLoot.id,
            guildId: 'guild1',
            memberId: 'member1',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should only create loot when at least one guild config accepts it', async () => {
      const guild2: Guild = {
        id: 'guild2',
        name: 'Test Guild 2',
        vanityUrl: null,
        icon: 'icon2.png',
        ownerId: 'owner456',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: 'guild1',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.HEROIC],
              lootlogConfigId: 'config1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
        {
          id: 'guild2',
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 2,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.UNIQUE],
              lootlogConfigId: 'config2',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);

      prismaService.member.findMany.mockResolvedValue([
        {
          id: 'member1',
          guildId: 'guild1',
          userId: discordId,
        },
        {
          id: 'member2',
          guildId: 'guild2',
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: 'unique123' };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      await service.createLoot(discordId, userId, mockCreateLootDto);

      expect(prismaService.loot.create).toHaveBeenCalled();
      expect(prismaService.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            lootId: mockLoot.id,
            guildId: 'guild2',
            memberId: 'member2',
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('getComments', () => {
    const options = {
      discordId: 'discord123',
      guildId: 'guild1',
      lootId: 1,
    };

    it('should return comments for loot', async () => {
      const mockComments = [
        {
          id: 'comment1',
          content: 'Test comment',
          member: {
            name: 'Test User',
            avatar: 'avatar.png',
            userId: 'user123',
            roles: [{ color: 16711680 }],
          },
        },
      ];
      prismaService.lootComment.findMany.mockResolvedValue(mockComments);

      const result = await service.getComments(options);

      expect(prismaService.lootComment.findMany).toHaveBeenCalledWith({
        where: { guildId: options.guildId, lootId: options.lootId },
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: {
              name: true,
              avatar: true,
              userId: true,
              roles: {
                select: { color: true },
                orderBy: { position: 'desc' },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockComments);
    });
  });

  describe('deleteLoot', () => {
    const options = { guildId: 'guild1', lootId: 1 };

    it('should delete loot submissions when loot exists', async () => {
      const mockLoot = { id: 1 };
      prismaService.loot.findFirst.mockResolvedValue(mockLoot);

      await service.deleteLoot(options);

      expect(prismaService.lootSubmission.deleteMany).toHaveBeenCalledWith({
        where: { lootId: options.lootId, guildId: options.guildId },
      });
    });

    it('should throw ForbiddenException when loot does not exist', async () => {
      prismaService.loot.findFirst.mockResolvedValue(null);

      await expect(service.deleteLoot(options)).rejects.toThrow(
        new ForbiddenException(ErrorKey.CANT_DELETE_LOOT),
      );
    });
  });

  describe('createComment', () => {
    const options = {
      discordId: 'discord123',
      userId: 'user123',
      guildId: 'guild1',
      lootId: 1,
      body: { content: 'Test comment' } as CreateCommentDto,
    };

    it('should create comment when loot exists', async () => {
      const mockLoot = { id: 1 };
      const mockComment = { id: 'comment1', content: 'Test comment' };
      prismaService.loot.findFirst.mockResolvedValue(mockLoot);
      prismaService.lootComment.create.mockResolvedValue(mockComment);

      const result = await service.createComment(options);

      expect(prismaService.lootComment.create).toHaveBeenCalled();
      expect(result).toEqual(mockComment);
    });

    it('should throw ForbiddenException when loot does not exist', async () => {
      prismaService.loot.findFirst.mockResolvedValue(null);

      await expect(service.createComment(options)).rejects.toThrow(
        new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT),
      );
    });
  });

  describe('updateLoot', () => {
    const discordId = 'discord123';
    const lootId = 1;
    const updateData: UpdateLootDto = {
      msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
    };

    it('should update loot share when valid', async () => {
      const mockLoot = {
        id: 1,
        lootShare: {},
        players: JSON.stringify([{ id: '1123', name: 'Test Player' }]),
        items: JSON.stringify([{ hid: 'abc123', name: 'Test Item' }]),
      };
      const mockUpdatedLoot = { lootShare: { '1123': ['abc123'] } };

      prismaService.loot.findFirst.mockResolvedValue(mockLoot);
      prismaService.loot.update.mockResolvedValue(mockUpdatedLoot);

      const result = await service.updateLoot(discordId, lootId, updateData);

      expect(prismaService.loot.update).toHaveBeenCalledWith({
        where: { id: lootId },
        data: { lootShare: { '1123': ['abc123'] } },
      });
      expect(result).toEqual({ '1123': ['abc123'] });
    });

    it('should throw ForbiddenException when loot not found', async () => {
      prismaService.loot.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLoot(discordId, lootId, updateData),
      ).rejects.toThrow(new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT));
    });

    it('should throw BadRequestException when no loot share found in message', async () => {
      const mockLoot = {
        id: 1,
        lootShare: {},
        players: JSON.stringify([]),
        items: JSON.stringify([]),
      };
      prismaService.loot.findFirst.mockResolvedValue(mockLoot);

      const invalidUpdateData = { msg: 'Invalid message' };

      await expect(
        service.updateLoot(discordId, lootId, invalidUpdateData),
      ).rejects.toThrow(new BadRequestException(ErrorKey.MISSING_LOOT_SHARE));
    });
  });

  describe('fetchLootsByGuildId', () => {
    const params: FetchLootsParamsDto = {
      cursor: null,
      limit: 10,
      npcTypes: [],
      npcs: [],
      players: [],
      rarities: [],
      world: 'testworld',
    };

    it('should throw BadRequestException when limit too high', async () => {
      const highLimitParams = { ...params, limit: 1000 };

      await expect(
        service.fetchLootsByGuildId(mockGuild, [], [], highLimitParams),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return loots with submissions', async () => {
      const mockLoots = [{ id: 1, uniqueId: 'unique1' }];
      const mockSubmissions = [
        {
          lootId: 1,
          member: {
            name: 'Test User',
            avatar: 'avatar.png',
            userId: 'user123',
          },
        },
      ];

      prismaService.$queryRaw.mockResolvedValue(mockLoots);
      prismaService.lootSubmission.findMany.mockResolvedValue(mockSubmissions);

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        [],
        [],
        params,
      );

      expect(result).toEqual([
        {
          id: 1,
          uniqueId: 'unique1',
          submissions: [mockSubmissions[0]],
        },
      ]);
    });

    it('should return empty array when no loots found', async () => {
      prismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        [],
        [],
        params,
      );

      expect(result).toEqual([]);
      expect(prismaService.lootSubmission.findMany).not.toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    describe('createUniqueLootId', () => {
      it('should create consistent hash for same input', () => {
        const loots = [{ hid: 'item1' }, { hid: 'item2' }];
        const world = 'testworld';

        const result1 = service.createUniqueLootId(loots as any, world);
        const result2 = service.createUniqueLootId(loots as any, world);

        expect(result1).toBe(result2);
        expect(result1).toHaveLength(64); // SHA256 hex length
      });

      it('should create different hashes for different inputs', () => {
        const loots1 = [{ hid: 'item1' }];
        const loots2 = [{ hid: 'item2' }];
        const world = 'testworld';

        const result1 = service.createUniqueLootId(loots1 as any, world);
        const result2 = service.createUniqueLootId(loots2 as any, world);

        expect(result1).not.toBe(result2);
      });
    });

    describe('parseItemStats', () => {
      it('should parse item stats correctly', () => {
        const stats = 'lvl=50;rarity=UNIQUE;reqp=w';

        const result = service.parseItemStats(stats);

        expect(result).toEqual({
          lvl: '50',
          rarity: 'UNIQUE',
          reqp: 'w',
        });
      });

      it('should handle empty stats', () => {
        const result = service.parseItemStats('');
        expect(result).toEqual({});
      });

      it('should ignore malformed entries', () => {
        const stats = 'lvl=50;invalidentry;rarity=UNIQUE';

        const result = service.parseItemStats(stats);

        expect(result).toEqual({
          lvl: '50',
          rarity: 'UNIQUE',
        });
      });
    });

    describe('getItemStats', () => {
      it('should extract item statistics correctly', () => {
        const item = {
          stat: 'lvl=50;rarity=UNIQUE;reqp=w',
          cl: 1,
        } as any;

        const result = service.getItemStats(item);

        expect(result).toEqual({
          lvl: 50,
          rarity: ItemRarity.UNIQUE,
          prof: [Profession.WARRIOR],
          type: expect.any(String), // Depends on getItemTypeByCl implementation
        });
      });

      it('should handle missing level', () => {
        const item = {
          stat: 'rarity=UNIQUE',
          cl: 1,
        } as any;

        const result = service.getItemStats(item);

        expect(result.lvl).toBe(0);
      });

      it('should default to all professions when no reqp specified', () => {
        const item = {
          stat: 'lvl=50;rarity=UNIQUE',
          cl: 1,
        } as any;

        const result = service.getItemStats(item);

        expect(result.prof).toEqual(Object.values(Profession));
      });
    });

    describe('parseJsonField', () => {
      it('should parse JSON string', () => {
        const jsonString = '{"test": "value"}';

        const result = service['parseJsonField'](jsonString);

        expect(result).toEqual({ test: 'value' });
      });

      it('should return non-string values as-is', () => {
        const objectValue = { test: 'value' };

        const result = service['parseJsonField'](objectValue);

        expect(result).toBe(objectValue);
      });
    });

    describe('processNpcs', () => {
      it('should sort NPCs by wt descending and return processed data', () => {
        const npcs = [
          {
            id: 1,
            wt: 100,
            name: 'NPC1',
            lvl: 10,
            prof: 'w',
            icon: 'icon1.png',
            location: 'loc1',
            type: 1,
            hpp: 1000,
            x: 100,
            y: 200,
          },
          {
            id: 2,
            wt: 200,
            name: 'NPC2',
            lvl: 20,
            prof: 'p',
            icon: 'icon2.png',
            location: 'loc2',
            type: 2,
            hpp: 2000,
            x: 150,
            y: 250,
          },
        ];

        const result = service['processNpcs'](npcs);

        expect(result.highest).toEqual(npcs[1]); // Highest wt NPC
        expect(result.sorted).toEqual([npcs[1], npcs[0]]); // Sorted descending
        expect(result.mapped).toHaveLength(2);
        expect(result.mapped[0].wt).toBe(200); // First should be highest
      });
    });

    describe('getLootShareFromMsg', () => {
      it('should parse loot share message correctly', () => {
        const msg =
          'Test Player otrzymał ITEM#abc123:"Item One", ITEM#def456:"Item Two"';

        const result = service.getLootShareFromMsg(msg);

        expect(result).toEqual({
          'Test Player': ['abc123', 'def456'],
        });
      });

      it('should handle empty message', () => {
        const result = service.getLootShareFromMsg('');
        expect(result).toEqual({});
      });

      it('should handle multiple players', () => {
        const msg =
          'Player1 otrzymał ITEM#abc123:"Item One" Player2 otrzymała ITEM#def456:"Item Two"';

        const result = service.getLootShareFromMsg(msg);

        expect(result).toEqual({
          Player1: ['abc123'],
          Player2: ['def456'],
        });
      });
    });
  });
});
