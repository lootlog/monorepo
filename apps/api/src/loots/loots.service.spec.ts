import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { LootsService } from "./loots.service";
import { PlayersService } from "../players/players.service";
import { NpcsService } from "../npcs/npcs.service";
import { ItemsService } from "../items/items.service";
import { GuildsService } from "../guilds/guilds.service";
import { PrismaService } from "../db/prisma.service";
import { LootlogConfigService } from "../lootlog-config/lootlog-config.service";
import { UserLootlogConfigService } from "../user-lootlog-config/user-lootlog-config.service";
import { LootMappingService } from "./services/loot-mapping.service";
import { LootValidationService } from "./services/loot-validation.service";
import { LootQueryService } from "./services/loot-query.service";
import { LootCommentService } from "./services/loot-comment.service";
import { RedisService } from "../lib/redis/redis.service";
import type { CreateLootDto } from "./dto/create-loot.dto";
import type { UpdateLootDto } from "./dto/update-loot.dto";
import type { CreateCommentDto } from "./dto/create-comment-dto";
import type { FetchLootsParamsDto } from "./dto/fetch-loots-params.dto";
import {
  ItemRarity,
  Profession,
  NpcType,
  type Guild,
  LootSource,
} from "generated/client";
import { ErrorKey } from "./enum/error-key.enum";

describe("LootsService", () => {
  let service: LootsService;
  let prismaService: {
    loot: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    lootSubmission: {
      createMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
    lootComment: {
      create: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    member: {
      findMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };
  let playersService: {
    bulkIndexPlayers: jest.Mock;
  };
  let npcsService: {
    bulkIndexNpcs: jest.Mock;
  };
  let _itemsService: {
    bulkIndexItems: jest.Mock;
  };
  let guildsService: {
    getGuildsForRequiredPermissions: jest.Mock;
  };
  let lootlogConfigService: {
    getMultipleLootlogConfigs: jest.Mock;
  };
  let userLootlogConfigService: {
    getLootlogCharacterConfig: jest.Mock;
  };
  let _redisService: {
    getClient: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    set: jest.Mock;
  };

  const mockGuild: Guild = {
    id: "guild1",
    name: "Test Guild",
    vanityUrl: null,
    icon: "icon.png",
    ownerId: "owner123",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateLootDto: CreateLootDto = {
    loots: [
      {
        id: 1,
        hid: "item1",
        name: "Test Item",
        icon: "item.png",
        pr: 1000,
        prc: "1k",
        stat: "lvl=50;rarity=UNIQUE",
        cl: 1,
        own: 1,
      },
    ],
    npcs: [
      {
        id: 1,
        name: "Test NPC",
        location: "Test Location",
        lvl: 50,
        prof: "w",
        wt: 10,
        hpp: 5000,
        icon: "npc.png",
        type: 1,
        x: 100,
        y: 200,
      },
    ],
    players: [
      {
        id: 1,
        accountId: 123,
        name: "Test Player",
        lvl: 50,
        prof: "w",
        icon: "player.png",
        hpp: 3000,
      },
    ],
    world: "testworld",
    source: LootSource.FIGHT,
    location: "Test Location",
    accountId: "123",
    characterId: "1",
  };

  beforeEach(async () => {
    const mockPrismaService = {
      loot: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
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
        groupBy: jest.fn(),
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

    const mockItemsService = {
      bulkIndexItems: jest.fn(),
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

    const mockRedisClient = {} as Record<string, never>;

    const mockRedisService = {
      getClient: jest.fn().mockResolvedValue(mockRedisClient),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue("OK"),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LootsService,
        LootMappingService,
        LootValidationService,
        LootQueryService,
        LootCommentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: NpcsService, useValue: mockNpcsService },
        { provide: ItemsService, useValue: mockItemsService },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: LootlogConfigService, useValue: mockLootlogConfigService },
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
        { provide: RedisService, useValue: mockRedisService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<LootsService>(LootsService);
    await service.onModuleInit();

    const mockLock = {
      release: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(service["redlock"], "acquire")
      .mockResolvedValue(mockLock as any);

    prismaService = module.get(PrismaService);
    playersService = module.get(PlayersService);
    npcsService = module.get(NpcsService);
    _itemsService = module.get(ItemsService);
    guildsService = module.get(GuildsService);
    lootlogConfigService = module.get(LootlogConfigService);
    userLootlogConfigService = module.get(UserLootlogConfigService);
    _redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("createLoot", () => {
    const discordId = "discord123";
    const userId = "user123";

    beforeEach(() => {
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
      ]);
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ["guild1"],
      } as any);
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
              lootlogConfigId: "config1",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);
      prismaService.member.findMany.mockResolvedValue([
        {
          id: "member1",
          guildId: "guild1",
          userId: discordId,
        },
      ]);
    });

    it("should throw ForbiddenException when user has no guilds with write permission", async () => {
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should create new loot when it does not exist", async () => {
      const mockLoot = { id: 1, uniqueId: "unique123" };
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

    it("should return existing loot when it already exists", async () => {
      const mockLoot = { id: 1, uniqueId: "unique123" };
      prismaService.loot.findUnique.mockResolvedValue(mockLoot);

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

      expect(prismaService.loot.findUnique).toHaveBeenCalled();
      expect(prismaService.loot.create).not.toHaveBeenCalled();
      expect(playersService.bulkIndexPlayers).not.toHaveBeenCalled();
      expect(npcsService.bulkIndexNpcs).not.toHaveBeenCalled();
      expect(result).toEqual({ id: mockLoot.id });
    });

    it("should throw BadRequestException when no valid configs found", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ["guild1"],
      } as any);
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

    it("should throw BadRequestException when no guild config accepts the loot", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ["guild1"],
      } as any);
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.COMMON,
              allowedRarities: [ItemRarity.HEROIC],
              lootlogConfigId: "config1",
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

    it("should create submissions for user with multiple guilds", async () => {
      const guild2: Guild = {
        id: "guild2",
        name: "Test Guild 2",
        vanityUrl: null,
        icon: "icon2.png",
        ownerId: "owner456",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ["guild1", "guild2"],
      } as any);

      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
              lootlogConfigId: "config1",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
        {
          id: "guild2",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 2,
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
              lootlogConfigId: "config2",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);

      prismaService.member.findMany.mockResolvedValue([
        {
          id: "member1",
          guildId: "guild1",
          userId: discordId,
        },
        {
          id: "member2",
          guildId: "guild2",
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: "unique123" };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      await service.createLoot(discordId, userId, mockCreateLootDto);

      expect(prismaService.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            lootId: mockLoot.id,
            guildId: "guild1",
            memberId: "member1",
          },
          {
            lootId: mockLoot.id,
            guildId: "guild2",
            memberId: "member2",
          },
        ],
        skipDuplicates: true,
      });
    });

    it("should filter guilds based on user whitelist config", async () => {
      const guild2: Guild = {
        id: "guild2",
        name: "Test Guild 2",
        vanityUrl: null,
        icon: "icon2.png",
        ownerId: "owner456",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ["guild1"],
      } as any);

      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE],
              lootlogConfigId: "config1",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);

      prismaService.member.findMany.mockResolvedValue([
        {
          id: "member1",
          guildId: "guild1",
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: "unique123" };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      await service.createLoot(discordId, userId, mockCreateLootDto);

      expect(
        lootlogConfigService.getMultipleLootlogConfigs,
      ).toHaveBeenCalledWith(["guild1"]);
      expect(prismaService.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            lootId: mockLoot.id,
            guildId: "guild1",
            memberId: "member1",
          },
        ],
        skipDuplicates: true,
      });
    });

    it("should only create loot when at least one guild config accepts it", async () => {
      const guild2: Guild = {
        id: "guild2",
        name: "Test Guild 2",
        vanityUrl: null,
        icon: "icon2.png",
        ownerId: "owner456",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        collectLootWhitelistGuildIds: ["guild1", "guild2"],
      } as any);

      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 1,
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.HEROIC],
              lootlogConfigId: "config1",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
        {
          id: "guild2",
          createdAt: new Date(),
          updatedAt: new Date(),
          npcs: [
            {
              id: 2,
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE],
              lootlogConfigId: "config2",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ]);

      prismaService.member.findMany.mockResolvedValue([
        {
          id: "member1",
          guildId: "guild1",
          userId: discordId,
        },
        {
          id: "member2",
          guildId: "guild2",
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: "unique123" };
      prismaService.loot.findUnique.mockResolvedValue(null);
      prismaService.loot.create.mockResolvedValue(mockLoot);

      await service.createLoot(discordId, userId, mockCreateLootDto);

      expect(prismaService.loot.create).toHaveBeenCalled();
      expect(prismaService.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            lootId: mockLoot.id,
            guildId: "guild2",
            memberId: "member2",
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe("getComments", () => {
    const options = {
      discordId: "discord123",
      guildId: "guild1",
      lootId: 1,
    };

    it("should return comments for loot", async () => {
      const mockComments = [
        {
          id: "comment1",
          content: "Test comment",
          member: {
            name: "Test User",
            avatar: "avatar.png",
            userId: "user123",
            roles: [{ color: 16711680 }],
          },
        },
      ];
      prismaService.lootComment.findMany.mockResolvedValue(mockComments);

      const result = await service.getComments(options);

      expect(prismaService.lootComment.findMany).toHaveBeenCalledWith({
        where: { guildId: options.guildId, lootId: options.lootId },
        orderBy: { createdAt: "desc" },
        include: {
          member: {
            select: {
              name: true,
              avatar: true,
              userId: true,
              roles: {
                select: { color: true },
                orderBy: { position: "desc" },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockComments);
    });
  });

  describe("deleteLoot", () => {
    const options = { guildId: "guild1", lootId: 1 };

    it("should delete loot submissions when loot exists", async () => {
      const mockLoot = { id: 1 };
      prismaService.loot.findFirst.mockResolvedValue(mockLoot);

      await service.deleteLoot(options);

      expect(prismaService.lootSubmission.deleteMany).toHaveBeenCalledWith({
        where: { lootId: options.lootId, guildId: options.guildId },
      });
    });

    it("should throw ForbiddenException when loot does not exist", async () => {
      prismaService.loot.findFirst.mockResolvedValue(null);

      await expect(service.deleteLoot(options)).rejects.toThrow(
        new ForbiddenException(ErrorKey.CANT_DELETE_LOOT),
      );
    });
  });

  describe("createComment", () => {
    const options = {
      discordId: "discord123",
      userId: "user123",
      guildId: "guild1",
      lootId: 1,
      body: { content: "Test comment" } as CreateCommentDto,
    };

    it("should create comment when loot exists", async () => {
      const mockLoot = { id: 1 };
      const mockComment = { id: "comment1", content: "Test comment" };
      prismaService.loot.findFirst.mockResolvedValue(mockLoot);
      prismaService.lootComment.create.mockResolvedValue(mockComment);

      const result = await service.createComment(options);

      expect(prismaService.lootComment.create).toHaveBeenCalled();
      expect(result).toEqual(mockComment);
    });

    it("should throw ForbiddenException when loot does not exist", async () => {
      prismaService.loot.findFirst.mockResolvedValue(null);

      await expect(service.createComment(options)).rejects.toThrow(
        new ForbiddenException(ErrorKey.CANT_CREATE_COMMENT),
      );
    });
  });

  describe("updateLoot", () => {
    const discordId = "discord123";
    const lootId = 1;
    const updateData: UpdateLootDto = {
      msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
    };

    it("should update loot share when valid", async () => {
      const mockLoot = {
        id: 1,
        lootShare: {},
        lootPlayers: [
          {
            id: 1,
            lvl: 50,
            hpp: 3000,
            playerSnapshot: {
              id: 1,
              characterId: 1,
              accountId: 123,
              name: "Test Player",
              prof: Profession.WARRIOR,
              icon: "player.png",
              world: "testworld",
              snapshotHash: "hash123",
              createdAt: new Date(),
            },
          },
        ],
        lootItems: [
          {
            id: 1,
            hid: "abc123",
            itemSnapshot: {
              id: 1,
              itemId: 1,
              statsHash: "hash456",
              name: "Test Item",
              icon: "item.png",
              lvl: 50,
              rarity: ItemRarity.UNIQUE,
              itemType: "WEAPON",
              statRaw: "lvl=50;rarity=UNIQUE",
              statsSnapshot: {},
              createdAt: new Date(),
            },
          },
        ],
      };
      const mockUpdatedLoot = { lootShare: { "1123": ["abc123"] } };

      prismaService.loot.findFirst.mockResolvedValue(mockLoot);
      prismaService.loot.update.mockResolvedValue(mockUpdatedLoot);

      const result = await service.updateLoot(discordId, lootId, updateData);

      expect(prismaService.loot.update).toHaveBeenCalledWith({
        where: { id: lootId },
        data: { lootShare: { "1123": ["abc123"] } },
      });
      expect(result).toEqual({ "1123": ["abc123"] });
    });

    it("should throw ForbiddenException when loot not found", async () => {
      prismaService.loot.findFirst.mockResolvedValue(null);

      await expect(
        service.updateLoot(discordId, lootId, updateData),
      ).rejects.toThrow(new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT));
    });

    it("should throw BadRequestException when no loot share found in message", async () => {
      const mockLoot = {
        id: 1,
        lootShare: {},
        lootPlayers: [],
        lootItems: [],
      };
      prismaService.loot.findFirst.mockResolvedValue(mockLoot);

      const invalidUpdateData = { msg: "Invalid message" };

      await expect(
        service.updateLoot(discordId, lootId, invalidUpdateData),
      ).rejects.toThrow(new BadRequestException(ErrorKey.MISSING_LOOT_SHARE));
    });
  });

  describe("fetchLootsByGuildId", () => {
    const params: FetchLootsParamsDto = {
      cursor: null,
      limit: 10,
      npcTypes: [],
      npcs: [],
      players: [],
      rarities: [],
      world: "testworld",
    };

    it("should return loots with submissions", async () => {
      const mockSubmissions = [
        {
          lootId: 1,
          member: {
            name: "Test User",
            avatar: "avatar.png",
            userId: "user123",
          },
        },
      ];

      const mockLootsWithRelations = [
        {
          id: 1,
          uniqueId: "unique1",
          world: "testworld",
          source: LootSource.FIGHT,
          location: "Test Location",
          lootShare: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lootSubmissions: mockSubmissions,
          lootItems: [],
          lootPlayers: [],
          lootNpcs: [],
        },
      ];

      prismaService.loot.findMany.mockResolvedValue(mockLootsWithRelations);
      prismaService.lootComment.groupBy.mockResolvedValue([
        { lootId: 1, _count: { _all: 0 } },
      ]);

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        [],
        [],
        params,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        uniqueId: "unique1",
        submissions: mockSubmissions,
      });
    });

    it("should return empty array when no loots found", async () => {
      prismaService.loot.findMany.mockResolvedValue([]);

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        [],
        [],
        params,
      );

      expect(result).toEqual([]);
      expect(prismaService.lootComment.groupBy).not.toHaveBeenCalled();
    });
  });
});
