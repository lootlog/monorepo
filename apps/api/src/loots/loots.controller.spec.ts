import { Test, type TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { LootsController } from './loots.controller';
import { LootsService } from './loots.service';
import type { CreateLootDto } from './dto/create-loot.dto';
import type { UpdateLootDto } from './dto/update-loot.dto';
import type { CreateCommentDto } from './dto/create-comment-dto';
import {
  Permission,
  LootSource,
  type Guild,
  type Role,
} from 'generated/client';
import { BadRequestException } from '@nestjs/common';
import { ErrorKey } from './enum/error-key.enum';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { LootCommentEntity } from 'src/shared/entities/loot-comment.entity';
import { LootEntity } from 'src/shared/entities/loot.entity';

describe('LootsController', () => {
  let controller: LootsController;
  let service: {
    createLoot: jest.Mock;
    fetchLootsByGuildId: jest.Mock;
    getComments: jest.Mock;
    createComment: jest.Mock;
    deleteLoot: jest.Mock;
    updateLoot: jest.Mock;
  };

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

  const mockRole: Role = {
    id: 'role1',
    name: 'Test Role',
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_READ],
    lvlRangeFrom: 1,
    lvlRangeTo: 100,
    guildId: 'guild1',
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
        wt: 1000,
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
    const mockLootsService = {
      createLoot: jest.fn(),
      fetchLootsByGuildId: jest.fn(),
      getComments: jest.fn(),
      createComment: jest.fn(),
      deleteLoot: jest.fn(),
      updateLoot: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LootsController],
      providers: [{ provide: LootsService, useValue: mockLootsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LootsController>(LootsController);
    service = module.get(LootsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('createLoot', () => {
    const discordId = 'discord123';

    it('should create a new loot', async () => {
      const mockResult = { id: 1 };
      service.createLoot.mockResolvedValue(mockResult);

      const result = await controller.createLoot(discordId, mockCreateLootDto);

      expect(service.createLoot).toHaveBeenCalledWith(
        discordId,
        mockCreateLootDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle service errors', async () => {
      service.createLoot.mockRejectedValue(
        new BadRequestException(ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT),
      );

      await expect(
        controller.createLoot(discordId, mockCreateLootDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle concurrent requests correctly', async () => {
      const mockResult = { id: 1 };
      service.createLoot.mockResolvedValue(mockResult);

      const requests = Array(5)
        .fill(null)
        .map(() => controller.createLoot(discordId, mockCreateLootDto));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result).toEqual(mockResult));
      expect(service.createLoot).toHaveBeenCalledTimes(5);
    });
  });

  describe('fetchLootsByGuildId', () => {
    const params = {
      cursor: null,
      limit: 10,
      npcTypes: [],
      npcs: [],
      players: [],
      rarities: [],
      world: 'testworld',
    };

    it('should fetch loots for guild', async () => {
      const mockLoots = [
        {
          id: 1,
          uniqueId: 'unique1',
          submissions: [
            {
              member: {
                name: 'Test User',
                avatar: 'avatar.png',
                userId: 'user123',
              },
            },
          ],
        },
      ];
      service.fetchLootsByGuildId.mockResolvedValue(mockLoots);

      const result = await controller.fetchLootsByGuildId(
        [Permission.LOOTLOG_READ],
        [mockRole],
        mockGuild,
        params.cursor,
        params.limit,
        params.world,
        params.npcTypes,
        params.rarities,
        params.players,
        params.npcs,
      );

      expect(service.fetchLootsByGuildId).toHaveBeenCalledWith(
        mockGuild,
        [Permission.LOOTLOG_READ],
        [mockRole],
        params,
      );
      const expectedResult = plainToInstance(LootEntity, mockLoots);
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty results', async () => {
      service.fetchLootsByGuildId.mockResolvedValue([]);

      const result = await controller.fetchLootsByGuildId(
        [Permission.LOOTLOG_READ],
        [mockRole],
        mockGuild,
        params.cursor,
        params.limit,
        params.world,
        params.npcTypes,
        params.rarities,
        params.players,
        params.npcs,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getComments', () => {
    const discordId = 'discord123';
    const lootId = 1;

    it('should get comments for loot', async () => {
      const mockComments = [
        {
          id: 1,
          content: 'Test comment',
          createdAt: new Date(),
          updatedAt: new Date(),
          lootId: 1,
          memberId: 1,
          guildId: 'guild1',
          member: {
            name: 'Test User',
            avatar: 'avatar.png',
            userId: 'user123',
            roles: [{ color: 16711680 }],
          },
        },
      ];
      service.getComments.mockResolvedValue(mockComments as any);

      const result = await controller.getComments(discordId, lootId, mockGuild);

      expect(service.getComments).toHaveBeenCalledWith({
        discordId,
        lootId,
        guildId: mockGuild.id,
      });
      const expectedResult = plainToInstance(LootCommentEntity, mockComments);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createComment', () => {
    const discordId = 'discord123';
    const lootId = 1;
    const body: CreateCommentDto = { content: 'Test comment' };

    it('should create a comment', async () => {
      const mockComment = {
        id: 1,
        content: 'Test comment',
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: 1,
        memberId: 1,
        guildId: 'guild1',
      };
      service.createComment.mockResolvedValue(mockComment);

      const result = await controller.createComment(
        discordId,
        lootId,
        body,
        mockGuild,
      );

      expect(service.createComment).toHaveBeenCalledWith({
        discordId,
        lootId,
        body,
        guildId: mockGuild.id,
      });
      const expectedResult = plainToInstance(LootCommentEntity, mockComment);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteLoot', () => {
    const lootId = 1;

    it('should delete a loot', async () => {
      service.deleteLoot.mockResolvedValue(undefined);

      await controller.deleteLoot(lootId, mockGuild);

      expect(service.deleteLoot).toHaveBeenCalledWith({
        guildId: mockGuild.id,
        lootId,
      });
    });
  });

  describe('updateLoot', () => {
    const discordId = 'discord123';
    const lootId = 1;
    const body: UpdateLootDto = {
      msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
    };

    it('should update a loot', async () => {
      const mockLootShare = { '1123': ['abc123'] };
      service.updateLoot.mockResolvedValue(mockLootShare);

      const result = await controller.updateLoot(discordId, body, lootId);

      expect(service.updateLoot).toHaveBeenCalledWith(discordId, lootId, body);
      expect(result).toEqual(mockLootShare);
    });
  });
});
