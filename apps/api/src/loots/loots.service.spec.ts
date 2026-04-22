import type { Mock } from "vitest";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
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
import { RedisService } from "@lootlog/nest-shared/redis";
import { RedlockService } from "src/lib/redlock/redlock.service";
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
} from "src/generated/prisma/client";
import { ErrorKey } from "./enum/error-key.enum";

describe("LootsService", () => {
  let service: LootsService;
  let prismaService: {
    loot: {
      findUnique: Mock;
      create: Mock;
      update: Mock;
      findFirst: Mock;
      findMany: Mock;
    };
    lootSubmission: {
      createMany: Mock;
      upsert: Mock;
      deleteMany: Mock;
      findMany: Mock;
    };
    lootComment: {
      create: Mock;
      findMany: Mock;
      groupBy: Mock;
    };
    member: {
      findMany: Mock;
    };
    $queryRaw: Mock;
  };
  let playersService: {
    bulkIndexPlayers: Mock;
  };
  let npcsService: {
    bulkIndexNpcs: Mock;
  };
  let _itemsService: {
    bulkIndexItems: Mock;
  };
  let guildsService: {
    getGuildsForRequiredPermissions: Mock;
  };
  let lootlogConfigService: {
    getMultipleLootlogConfigs: Mock;
  };
  let userLootlogConfigService: {
    getLootlogCharacterConfig: Mock;
  };
  let _redisService: {
    getClient: Mock;
    get: Mock;
    del: Mock;
    set: Mock;
  };

  const mockGuild: Guild = {
    id: "guild1",
    name: "Test Guild",
    vanityUrl: null,
    icon: "icon.png",
    ownerId: "owner123",
    notificationRuleLimit: 20,
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
        findUnique: mockFn(),
        create: mockFn(),
        update: mockFn(),
        findFirst: mockFn(),
        findMany: mockFn(),
      },
      lootSubmission: {
        createMany: mockFn(),
        upsert: mockFn(),
        deleteMany: mockFn(),
        findMany: mockFn(),
      },
      lootComment: {
        create: mockFn(),
        findMany: mockFn(),
        groupBy: mockFn(),
      },
      member: {
        findMany: mockFn(),
      },
      $queryRaw: mockFn(),
    };

    const mockPlayersService = {
      bulkIndexPlayers: mockFn(),
    };

    const mockNpcsService = {
      bulkIndexNpcs: mockFn(),
    };

    const mockItemsService = {
      bulkIndexItems: mockFn(),
    };

    const mockGuildsService = {
      getGuildsForRequiredPermissions: mockFn(),
    };

    const mockLootlogConfigService = {
      getMultipleLootlogConfigs: mockFn(),
    };

    const mockUserLootlogConfigService = {
      getLootlogCharacterConfig: mockFn(),
    };

    const mockRedisClient = {} as Record<string, never>;

    const mockRedisService = {
      getClient: mockFn().mockReturnValue(mockRedisClient),
      get: mockFn().mockResolvedValue(null),
      del: mockFn().mockResolvedValue(1),
      set: mockFn().mockResolvedValue("OK"),
    };

    const mockLogger = {
      log: mockFn(),
      error: mockFn(),
      warn: mockFn(),
    };

    const mockAmqpConnection = {
      publish: mockFn(),
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
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: RedisService, useValue: mockRedisService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        {
          provide: RedlockService,
          useValue: {
            createInstance: mockFn().mockReturnValue({ acquire: mockFn() }),
          },
        },
      ],
    }).compile();

    service = module.get<LootsService>(LootsService);
    await service.onModuleInit();

    const mockLock = {
      release: mockFn().mockResolvedValue(undefined),
    };

    vi.spyOn(service["redlock"], "acquire").mockResolvedValue(
      mockLock as never,
    );

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
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("createLoot", () => {
    const discordId = "discord123";
    const userId = "user123";
    const expectedSuccessResponse = {
      id: 1,
      submittedGuilds: [
        {
          guildId: "guild1",
          guildName: "Test Guild",
        },
      ],
      rejectedGuilds: [],
    };

    beforeEach(() => {
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
      ]);
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      } as never);
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
        } as never,
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
      expect(_itemsService.bulkIndexItems).toHaveBeenCalledWith([
        {
          id: 1,
          name: "Test Item",
          icon: "item.png",
          stat: "lvl=50;rarity=UNIQUE",
          lvl: 50,
          rarity: ItemRarity.UNIQUE,
          type: "ONE_HAND_WEAPON",
          world: "testworld",
        },
      ]);
      expect(result).toEqual(expectedSuccessResponse);
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
      expect(result).toEqual(expectedSuccessResponse);
    });

    it("should throw BadRequestException when no valid configs found", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      } as never);
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([]);
      prismaService.loot.findUnique.mockResolvedValue(null);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toMatchObject({
        response: {
          message: ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
          submittedGuilds: [],
          rejectedGuilds: [
            {
              guildId: "guild1",
              guildName: "Test Guild",
              reason: "MISSING_LOOTLOG_CONFIG",
            },
          ],
        },
      });

      expect(prismaService.loot.create).not.toHaveBeenCalled();
      expect(prismaService.lootSubmission.createMany).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when no guild config accepts the loot", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      } as never);
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
        } as never,
      ]);
      prismaService.loot.findUnique.mockResolvedValue(null);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toMatchObject({
        response: {
          message: ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
          submittedGuilds: [],
          rejectedGuilds: [
            {
              guildId: "guild1",
              guildName: "Test Guild",
              reason: "LOOT_NOT_ACCEPTED_BY_CONFIG",
            },
          ],
        },
      });

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
        notificationRuleLimit: 20,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2"],
      } as never);

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
        } as never,
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
        } as never,
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

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

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
      expect(result).toEqual({
        id: mockLoot.id,
        submittedGuilds: [
          {
            guildId: "guild1",
            guildName: "Test Guild",
          },
          {
            guildId: "guild2",
            guildName: "Test Guild 2",
          },
        ],
        rejectedGuilds: [],
      });
    });

    it("should filter guilds based on user whitelist config", async () => {
      const guild2: Guild = {
        id: "guild2",
        name: "Test Guild 2",
        vanityUrl: null,
        icon: "icon2.png",
        ownerId: "owner456",
        notificationRuleLimit: 20,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      } as never);

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
        } as never,
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

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

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
      expect(result).toEqual({
        id: mockLoot.id,
        submittedGuilds: [
          {
            guildId: "guild1",
            guildName: "Test Guild",
          },
        ],
        rejectedGuilds: [
          {
            guildId: "guild2",
            guildName: "Test Guild 2",
            reason: "NOT_ON_CHARACTER_WHITELIST",
          },
        ],
      });
    });

    it("should only create loot when at least one guild config accepts it", async () => {
      const guild2: Guild = {
        id: "guild2",
        name: "Test Guild 2",
        vanityUrl: null,
        icon: "icon2.png",
        ownerId: "owner456",
        notificationRuleLimit: 20,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        guild2,
      ]);

      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2"],
      } as never);

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
        } as never,
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
        } as never,
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

      const result = await service.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

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
      expect(result).toEqual({
        id: mockLoot.id,
        submittedGuilds: [
          {
            guildId: "guild2",
            guildName: "Test Guild 2",
          },
        ],
        rejectedGuilds: [
          {
            guildId: "guild1",
            guildName: "Test Guild",
            reason: "LOOT_NOT_ACCEPTED_BY_CONFIG",
          },
        ],
      });
    });

    it("should throw detailed whitelist rejection payload when no guild is whitelisted", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: [],
      } as never);

      await expect(
        service.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toMatchObject({
        response: {
          message: ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
          submittedGuilds: [],
          rejectedGuilds: [
            {
              guildId: "guild1",
              guildName: "Test Guild",
              reason: "NOT_ON_CHARACTER_WHITELIST",
            },
          ],
        },
      });
    });
  });

  describe("getComments", () => {
    const options = {
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
          _count: { comments: 0 },
        },
      ];

      prismaService.loot.findMany.mockResolvedValue(mockLootsWithRelations);

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

    it("should apply ranged loot filters to the Prisma query", async () => {
      prismaService.loot.findMany.mockResolvedValue([]);

      await service.fetchLootsByGuildId(mockGuild, [], [], {
        ...params,
        npcLevelMin: 10,
        npcLevelMax: 20,
        itemLevelMin: 30,
        itemLevelMax: 40,
        playerLevelMin: 50,
        playerLevelMax: 60,
        createdAtMin: "2024-01-01T00:00:00.000Z",
        createdAtMax: "2024-01-31T23:59:59.999Z",
      });

      expect(prismaService.loot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                lootNpcs: {
                  some: {
                    npcSnapshot: {
                      lvl: {
                        gte: 10,
                        lte: 20,
                      },
                    },
                  },
                },
              },
              {
                lootItems: {
                  some: {
                    itemSnapshot: {
                      lvl: {
                        gte: 30,
                        lte: 40,
                      },
                    },
                  },
                },
              },
              {
                lootPlayers: {
                  some: {
                    lvl: {
                      gte: 50,
                      lte: 60,
                    },
                  },
                },
              },
              {
                createdAt: {
                  gte: new Date("2024-01-01T00:00:00.000Z"),
                  lte: new Date("2024-01-31T23:59:59.999Z"),
                },
              },
            ]),
          }),
        }),
      );
    });
  });
});
