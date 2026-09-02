import type { Mock } from "vitest";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { LootsService } from "./loots.service.js";
import { PlayersService } from "../players/players.service.js";
import { NpcsService } from "../npcs/npcs.service.js";
import { ItemsService } from "../items/items.service.js";
import { GuildsService } from "../guilds/guilds.service.js";
import { LootlogConfigService } from "../lootlog-config/lootlog-config.service.js";
import { UserLootlogConfigService } from "../user-lootlog-config/user-lootlog-config.service.js";
import { LootAllocationService } from "./loot-allocation.service.js";
import { LootSubmissionAcceptanceService } from "./loot-submission-acceptance.service.js";
import { LootQueryService } from "./services/loot-query.service.js";
import { LootQueryRepository } from "./services/loot-query.repository.js";
import { LootCommentService } from "./services/loot-comment.service.js";
import { LootStatsService } from "./services/loot-stats.service.js";
import { LootsRepository } from "./loots.repository.js";
import { LootAllocationRepository } from "./loot-allocation.repository.js";
import { LootSubmissionAcceptanceRepository } from "./loot-submission-acceptance.repository.js";
import { RedisService } from "@lootlog/nest-shared/redis";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { ExecutionError } from "redlock";
import {
  createAccessPolicy,
  type Capability,
} from "@lootlog/domain/access-policy";
import type { CreateLootDto } from "./dto/create-loot.dto.js";
import type { UpdateLootDto } from "./dto/update-loot.dto.js";
import type { CreateCommentDto } from "./dto/create-comment-dto.js";
import type { FetchLootsParamsDto } from "./dto/fetch-loots-params.dto.js";
import { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import {
  LootSourceEnum as LootSource,
  ProfessionEnum as Profession,
} from "@lootlog/schema/loot";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import { ErrorKey } from "./enum/error-key.enum.js";
import { RoutingKey } from "#src/enum/routing-key.enum";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

const policy = (...capabilities: Capability[]) =>
  createAccessPolicy({ capabilities });

describe("Loot modules", () => {
  let service: LootsService;
  let acceptance: LootSubmissionAcceptanceService;
  let allocation: LootAllocationService;
  let databaseCalls: {
    loot: {
      findUnique: Mock;
      create: Mock;
      update: Mock;
      updateMany: Mock;
      findFirst: Mock;
      findMany: Mock;
      count: Mock;
    };
    npcSnapshot: {
      findFirst: Mock;
    };
    lootSubmission: {
      createMany: Mock;
      upsert: Mock;
      deleteMany: Mock;
      findMany: Mock;
    };
    organizationLootRecord: {
      createMany: Mock;
      findFirst: Mock;
      findMany: Mock;
      updateMany: Mock;
    };
    lootComment: {
      create: Mock;
      findMany: Mock;
      groupBy: Mock;
      count: Mock;
    };
    member: {
      findUnique: Mock;
      findMany: Mock;
    };
    $transaction: Mock;
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
    deleteByPattern: Mock;
    getOrSetJsonBestEffort: Mock;
  };
  let lootStatsService: {
    invalidateCache: Mock;
  };
  let lootQueryRepository: {
    findMany: Mock;
    count: Mock;
    findOne: Mock;
    resolveItemByHid: Mock;
  };
  let amqpConnection: {
    publish: Mock;
  };

  const mockGuild: Guild = {
    id: "guild1",
    name: "Test Guild",
    vanityUrl: null,
    icon: "icon.png",
    ownerId: "owner123",
    notificationRuleLimit: 20,
    publicStatsCardEnabled: false,
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 3,
    documentLimit: 50,
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
    const mockDatabaseCalls = {
      loot: {
        findUnique: mockFn(),
        create: mockFn(),
        update: mockFn(),
        updateMany: mockFn().mockResolvedValue({ count: 1 }),
        findFirst: mockFn(),
        findMany: mockFn(),
        count: mockFn(),
      },
      npcSnapshot: {
        findFirst: mockFn(),
      },
      lootSubmission: {
        createMany: mockFn(),
        upsert: mockFn(),
        deleteMany: mockFn(),
        findMany: mockFn(),
      },
      organizationLootRecord: {
        createMany: mockFn(),
        findFirst: mockFn(),
        findMany: mockFn(),
        updateMany: mockFn(),
      },
      lootComment: {
        create: mockFn(),
        findMany: mockFn(),
        groupBy: mockFn(),
        count: mockFn(),
      },
      member: {
        findUnique: mockFn(),
        findMany: mockFn(),
      },
      $transaction: mockFn(),
      $queryRaw: mockFn(),
    };
    mockDatabaseCalls.$transaction.mockImplementation(
      (callback: (tx: typeof mockDatabaseCalls) => Promise<unknown>) =>
        callback(mockDatabaseCalls),
    );
    const mockLootsRepository = {
      queryRaw: mockFn().mockImplementation((statement, parameters) =>
        mockDatabaseCalls.$queryRaw(statement, ...parameters),
      ),
      archive: mockFn().mockImplementation(async (options) => {
        const actor = await mockDatabaseCalls.member.findUnique({
          where: {
            memberId: {
              userId: options.discordId,
              guildId: options.guildId,
            },
          },
          select: { id: true },
        });
        if (!actor) return false;
        const result =
          await mockDatabaseCalls.organizationLootRecord.updateMany({
            where: {
              guildId: options.guildId,
              lootId: options.lootId,
              archivedAt: null,
            },
            data: {
              archivedAt: options.archivedAt,
              archivedByMemberId: actor.id,
            },
          });
        return result.count > 0;
      }),
      findComments: mockFn().mockImplementation((guildId, lootId) =>
        mockDatabaseCalls.lootComment.findMany({
          where: {
            organizationLootRecord: { guildId, lootId, archivedAt: null },
          },
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
        }),
      ),
      createComment: mockFn().mockImplementation(async (options) => {
        const record = await mockDatabaseCalls.organizationLootRecord.findFirst(
          {
            where: {
              lootId: options.lootId,
              guildId: options.guildId,
              archivedAt: null,
            },
            select: { id: true },
          },
        );
        if (!record) return { kind: "loot-missing" };
        const value = await mockDatabaseCalls.lootComment.create({
          data: {
            content: options.content,
            organizationLootRecord: { connect: { id: record.id } },
            member: {
              connect: {
                memberId: {
                  userId: options.discordId,
                  guildId: options.guildId,
                },
              },
            },
          },
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
        return { kind: "created", value };
      }),
    };
    const mockLootQueryRepository = {
      findItemSnapshotIds: mockFn().mockImplementation((names) =>
        mockDatabaseCalls.itemSnapshot.findMany({
          where: { name: { in: names } },
          select: { id: true },
        }),
      ),
      findMany: mockFn().mockImplementation(async (options) => {
        const records = await mockDatabaseCalls.organizationLootRecord.findMany(
          {
            where: {
              guildId: options.guildId,
              archivedAt: null,
              loot: options.filters,
            },
            orderBy: { lootId: "desc" },
            take: options.limit,
          },
        );
        return records.map((record) => ({
          ...record.loot,
          submissions: record.submissions,
          commentsCount: record._count.comments,
        }));
      }),
      count: mockFn().mockImplementation((options) =>
        mockDatabaseCalls.loot.count({ where: options.filters }),
      ),
      findOne: mockFn().mockImplementation(async (options) => {
        const loot = await mockDatabaseCalls.loot.findFirst({
          where: options.filters,
        });
        if (!loot) return null;
        const record = loot.organizationLootRecords?.[0];
        if (!record) return null;
        return {
          ...loot,
          submissions: record.submissions,
          commentsCount: record._count.comments,
        };
      }),
      resolveItemByHid: mockFn().mockImplementation(async (options) => {
        const loot = await mockDatabaseCalls.loot.findFirst({
          where: { hid: options.hid, world: options.world },
        });
        return loot?.lootItems?.[0] ?? null;
      }),
    };
    const authorizedLootWhere = (options: {
      actorUserId: string;
      lootId: number;
      submissionCutoff: Date;
    }) => ({
      id: options.lootId,
      organizationLootRecords: {
        some: {
          submissions: {
            some: {
              member: { globalUserId: options.actorUserId },
              createdAt: { gte: options.submissionCutoff },
            },
          },
        },
      },
    });
    const mockLootAllocationRepository = {
      hasAmbiguousNpcVariant: mockFn().mockImplementation(async (name) => {
        const row = await mockDatabaseCalls.npcSnapshot.findFirst({
          where: {
            name,
            OR: [{ type: { not: NpcType.COLOSSUS } }, { type: null }],
          },
          select: { id: true },
        });
        return Boolean(row);
      }),
      findAuthorizedLoot: mockFn().mockImplementation((options) =>
        mockDatabaseCalls.loot.findFirst({
          where: authorizedLootWhere(options),
          include: {
            lootItems: { include: { itemSnapshot: true } },
            lootPlayers: { include: { playerSnapshot: true } },
            lootNpcs: {
              include: { npcSnapshot: true },
              orderBy: { id: "asc" },
            },
            organizationLootRecords: {
              where: { archivedAt: null },
              select: { guildId: true },
            },
          },
        }),
      ),
      compareAndSetChatAllocation: mockFn().mockImplementation(
        async (options) => {
          const result = await mockDatabaseCalls.loot.updateMany({
            where: {
              ...authorizedLootWhere(options),
              lootShareSource: { not: "CHAT_MESSAGE" },
            },
            data: {
              lootShare: options.lootShare,
              lootShareSource: "CHAT_MESSAGE",
            },
          });
          return result.count > 0;
        },
      ),
      findAuthorizedAllocationState: mockFn().mockImplementation((options) =>
        mockDatabaseCalls.loot.findFirst({
          where: authorizedLootWhere(options),
          select: { lootShare: true, lootShareSource: true },
        }),
      ),
    };
    const mockLootSubmissionAcceptanceRepository = {
      findLootIdByUniqueId: mockFn().mockImplementation(async (uniqueId) => {
        const loot = await mockDatabaseCalls.loot.findUnique({
          where: { uniqueId },
          select: { id: true },
        });
        return loot?.id ?? null;
      }),
      findMembers: mockFn().mockImplementation((discordId, guildIds) =>
        mockDatabaseCalls.member.findMany({
          where: { guildId: { in: guildIds }, userId: discordId },
          select: { id: true, guildId: true },
        }),
      ),
      findExistingRecords: mockFn().mockImplementation((lootId, guildIds) =>
        mockDatabaseCalls.organizationLootRecord.findMany({
          where: { lootId, guildId: { in: guildIds } },
          select: {
            guildId: true,
            archivedAt: true,
            submissions: { select: { memberId: true } },
          },
        }),
      ),
      appendSubmissions: mockFn().mockImplementation((lootId, submissions) =>
        mockDatabaseCalls.$transaction(async (tx) => {
          const guildIds = [
            ...new Set(submissions.map(({ guildId }) => guildId)),
          ];
          await tx.organizationLootRecord.createMany({
            data: guildIds.map((guildId) => ({ guildId, lootId })),
            skipDuplicates: true,
          });
          const records = await tx.organizationLootRecord.findMany({
            where: { lootId, guildId: { in: guildIds } },
            select: { id: true, guildId: true, archivedAt: true },
          });
          const recordIdByGuildId = new Map(
            records.map((record) => [record.guildId, record.id]),
          );
          await tx.lootSubmission.createMany({
            data: submissions.map((submission) => ({
              organizationLootRecordId: recordIdByGuildId.get(
                submission.guildId,
              ),
              memberId: submission.memberId,
            })),
            skipDuplicates: true,
          });
          return records;
        }),
      ),
      createNewLoot: mockFn().mockImplementation(async (data) => {
        const loot = await mockDatabaseCalls.loot.create({
          data: {
            uniqueId: data.uniqueId,
            world: data.world,
            source: data.source,
            location: data.location,
            lootShare: data.lootShare,
            lootShareSource: data.lootShareSource,
            lootItems: {
              create: data.items.map((item) => ({
                itemSnapshot: {
                  connectOrCreate: {
                    where: {
                      itemId_statsHash: {
                        itemId: item.itemId,
                        statsHash: item.statsHash,
                      },
                    },
                    create: {
                      itemId: item.itemId,
                      statsHash: item.statsHash,
                      name: item.name,
                      icon: item.icon,
                      lvl: item.lvl,
                      rarity: item.rarity,
                      itemType: item.itemType,
                      statRaw: item.statRaw,
                      statsSnapshot: item.statsSnapshot,
                    },
                  },
                },
                hid: item.hid,
              })),
            },
            lootPlayers: {
              create: data.players.map((player) => ({
                lvl: player.lvl,
                playerSnapshot: {
                  connectOrCreate: {
                    where: {
                      world_accountId_characterId_snapshotHash: {
                        world: player.world,
                        accountId: player.accountId,
                        characterId: player.characterId,
                        snapshotHash: player.snapshotHash,
                      },
                    },
                    create: {
                      world: player.world,
                      accountId: player.accountId,
                      characterId: player.characterId,
                      snapshotHash: player.snapshotHash,
                      name: player.name,
                      prof: player.prof,
                      icon: player.icon,
                    },
                  },
                },
              })),
            },
            lootNpcs: {
              create: data.npcs.map((npc) => ({
                npcSnapshot: {
                  connectOrCreate: {
                    where: {
                      npcId_name: { npcId: npc.npcId, name: npc.name },
                    },
                    create: npc,
                  },
                },
              })),
            },
            organizationLootRecords: {
              create: data.submissions.map((submission) => ({
                guildId: submission.guildId,
                submissions: { create: { memberId: submission.memberId } },
              })),
            },
          },
        });
        return loot.id;
      }),
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
      deleteByPattern: mockFn().mockResolvedValue(0),
      getOrSetJsonBestEffort: mockFn(
        ({ factory }: { factory: () => Promise<unknown> }) => factory(),
      ),
    };
    const mockLootStatsService = {
      invalidateCache: mockFn().mockResolvedValue(undefined),
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
        LootAllocationService,
        {
          provide: LootAllocationRepository,
          useValue: mockLootAllocationRepository,
        },
        LootSubmissionAcceptanceService,
        {
          provide: LootSubmissionAcceptanceRepository,
          useValue: mockLootSubmissionAcceptanceRepository,
        },
        LootsService,
        LootQueryService,
        { provide: LootQueryRepository, useValue: mockLootQueryRepository },
        LootCommentService,
        { provide: LootsRepository, useValue: mockLootsRepository },
        { provide: LootStatsService, useValue: mockLootStatsService },
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
    acceptance = module.get(LootSubmissionAcceptanceService);
    allocation = module.get(LootAllocationService);
    acceptance.onModuleInit();

    const mockLock = {
      release: mockFn().mockResolvedValue(undefined),
    };

    vi.spyOn(acceptance["redlock"], "acquire").mockResolvedValue(
      mockLock as never,
    );

    databaseCalls = mockDatabaseCalls;
    playersService = module.get(PlayersService);
    npcsService = module.get(NpcsService);
    _itemsService = module.get(ItemsService);
    amqpConnection = module.get(AmqpConnection);
    guildsService = module.get(GuildsService);
    lootlogConfigService = module.get(LootlogConfigService);
    userLootlogConfigService = module.get(UserLootlogConfigService);
    _redisService = module.get(RedisService);
    lootStatsService = module.get(LootStatsService);
    lootQueryRepository = module.get(LootQueryRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });
  });

  describe("LootSubmissionAcceptanceService", () => {
    const discordId = "discord123";
    const createLootItem = (
      hid: string,
      own?: number,
    ): CreateLootDto["loots"][number] => ({
      id: Number(hid.replace(/\D/g, "")) || 1,
      hid,
      name: `Item ${hid}`,
      icon: "item.png",
      pr: 1,
      prc: "unique",
      stat: "lvl=50;rarity=UNIQUE",
      cl: 1,
      own,
    });
    const createPlayer = (
      id: number,
      accountId: number,
    ): CreateLootDto["players"][number] => ({
      id,
      accountId,
      name: `Player ${id}`,
      lvl: 50,
      prof: "w",
      icon: "player.png",
    });
    const standardColossus = {
      id: 173_890,
      name: "Wernoradzki Drakolisz",
      location: "Katakumby Antycznego Gniewu",
      lvl: 279,
      prof: "b",
      wt: 90,
      icon: "kol/kolos-drakolisz.gif",
      type: 2,
    } satisfies CreateLootDto["npcs"][number];
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
      databaseCalls.member.findMany.mockResolvedValue([
        {
          id: "member1",
          guildId: "guild1",
          userId: discordId,
        },
      ]);
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([
        { id: 10, guildId: "guild1", submissions: [] },
      ]);
    });

    it("should throw ForbiddenException when user has no guilds with write permission", async () => {
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);

      await expect(
        acceptance.accept({ discordId, submission: mockCreateLootDto }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should create new loot when it does not exist", async () => {
      const mockLoot = { id: 1, uniqueId: "unique123" };
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue(mockLoot);

      const result = await acceptance.accept({
        discordId,
        submission: mockCreateLootDto,
      });

      expect(databaseCalls.loot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationLootRecords: {
              create: [
                {
                  guildId: "guild1",
                  submissions: { create: { memberId: "member1" } },
                },
              ],
            },
          }),
        }),
      );
      expect(lootStatsService.invalidateCache).toHaveBeenCalledWith(["guild1"]);
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
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        RoutingKey.NOTIFICATIONS_LOOT_CREATED,
        {
          version: 2,
          lootId: 1,
          world: "testworld",
          guildIds: ["guild1"],
          itemIds: [1],
          itemNames: ["Test Item"],
          npcs: [
            {
              lvl: 50,
              type: NpcType.ELITE,
            },
          ],
        },
      );
      expect(acceptance["redlock"].acquire).toHaveBeenCalledWith(
        [expect.stringMatching(/^loot:lock:/)],
        30_000,
        {
          retryCount: 100,
          retryDelay: 100,
          retryJitter: 50,
        },
      );
      expect(result).toEqual(expectedSuccessResponse);
    });

    it("should create loot share from item owners for a standard colossus", async () => {
      const standardColossusDto: CreateLootDto = {
        ...mockCreateLootDto,
        npcs: [
          {
            id: 173_890,
            name: "Wernoradzki Drakolisz",
            location: "Katakumby Antycznego Gniewu",
            lvl: 279,
            prof: "b",
            wt: 90,
            icon: "kol/kolos-drakolisz.gif",
            type: 2,
          },
        ],
      };
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          npcs: [
            {
              npcType: NpcType.COLOSSUS,
              allowedRarities: [ItemRarity.UNIQUE],
            },
          ],
        },
      ]);
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.npcSnapshot.findFirst.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue({ id: 1 });

      await acceptance.accept({ discordId, submission: standardColossusDto });

      expect(databaseCalls.npcSnapshot.findFirst).toHaveBeenCalledWith({
        where: {
          name: "Wernoradzki Drakolisz",
          OR: [{ type: { not: NpcType.COLOSSUS } }, { type: null }],
        },
        select: { id: true },
      });
      expect(databaseCalls.loot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lootShare: { "1123": ["item1"] },
          lootShareSource: "ITEM_OWNER",
        }),
      });
    });

    it("creates a complete one-to-one allocation for a standard colossus", async () => {
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          npcs: [
            {
              npcType: NpcType.COLOSSUS,
              allowedRarities: [ItemRarity.UNIQUE],
            },
          ],
        },
      ]);
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.npcSnapshot.findFirst.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue({ id: 1 });

      await acceptance.accept({
        discordId,
        submission: {
          ...mockCreateLootDto,
          loots: [createLootItem("item-1", 11), createLootItem("item-2", 22)],
          players: [createPlayer(11, 101), createPlayer(22, 202)],
          npcs: [standardColossus],
        },
      });

      expect(databaseCalls.loot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lootShare: {
            "11101": ["item-1"],
            "22202": ["item-2"],
          },
          lootShareSource: "ITEM_OWNER",
        }),
      });
    });

    it("should leave loot share empty for an event-promoted colossus", async () => {
      const eventColossusDto: CreateLootDto = {
        ...mockCreateLootDto,
        npcs: [
          {
            id: 198_261,
            name: "Młody Smok",
            location: "Test Location",
            lvl: 268,
            prof: "w",
            wt: 91,
            icon: "her/smokbarb.gif",
            type: 2,
          },
        ],
      };
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          npcs: [
            {
              npcType: NpcType.COLOSSUS,
              allowedRarities: [ItemRarity.UNIQUE],
            },
          ],
        },
      ]);
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.npcSnapshot.findFirst.mockResolvedValue({ id: 114_998 });
      databaseCalls.loot.create.mockResolvedValue({ id: 1 });

      await acceptance.accept({ discordId, submission: eventColossusDto });

      expect(databaseCalls.loot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lootShare: {},
          lootShareSource: "NONE",
        }),
      });
    });

    it("should leave loot share empty for a non-colossus", async () => {
      const heroDto: CreateLootDto = {
        ...mockCreateLootDto,
        npcs: [
          {
            id: 114_998,
            name: "Młody Smok",
            location: "Test Location",
            lvl: 268,
            prof: "w",
            wt: 81,
            icon: "her/smokbarb.gif",
            type: 2,
          },
        ],
      };
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          npcs: [
            {
              npcType: NpcType.HERO,
              allowedRarities: [ItemRarity.UNIQUE],
            },
          ],
        },
      ]);
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue({ id: 1 });

      await acceptance.accept({ discordId, submission: heroDto });

      expect(databaseCalls.npcSnapshot.findFirst).not.toHaveBeenCalled();
      expect(databaseCalls.loot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lootShare: {},
          lootShareSource: "NONE",
        }),
      });
    });

    it("should leave colossus loot share empty when item owners are ambiguous", async () => {
      const ambiguousColossusDto: CreateLootDto = {
        ...mockCreateLootDto,
        loots: [{ ...mockCreateLootDto.loots[0], own: 999 }],
        npcs: [
          {
            id: 173_890,
            name: "Wernoradzki Drakolisz",
            location: "Katakumby Antycznego Gniewu",
            lvl: 279,
            prof: "b",
            wt: 90,
            icon: "kol/kolos-drakolisz.gif",
            type: 2,
          },
        ],
      };
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          npcs: [
            {
              npcType: NpcType.COLOSSUS,
              allowedRarities: [ItemRarity.UNIQUE],
            },
          ],
        },
      ]);
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.npcSnapshot.findFirst.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue({ id: 1 });

      await acceptance.accept({ discordId, submission: ambiguousColossusDto });

      expect(databaseCalls.loot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lootShare: {},
          lootShareSource: "NONE",
        }),
      });
    });

    it.each([
      {
        name: "an item has no owner",
        loots: [createLootItem("item-1", 11), createLootItem("item-2")],
        players: [createPlayer(11, 101), createPlayer(22, 202)],
      },
      {
        name: "an owner does not match a player",
        loots: [createLootItem("item-1", 11), createLootItem("item-2", 999)],
        players: [createPlayer(11, 101), createPlayer(22, 202)],
      },
      {
        name: "two items point to the same owner",
        loots: [createLootItem("item-1", 11), createLootItem("item-2", 11)],
        players: [createPlayer(11, 101), createPlayer(22, 202)],
      },
      {
        name: "player ids are duplicated",
        loots: [createLootItem("item-1", 11), createLootItem("item-2", 22)],
        players: [createPlayer(11, 101), createPlayer(11, 202)],
      },
      {
        name: "the item and player counts differ",
        loots: [createLootItem("item-1", 11)],
        players: [createPlayer(11, 101), createPlayer(22, 202)],
      },
    ])(
      "keeps the initial allocation empty when $name",
      async ({ loots, players }) => {
        lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
          {
            id: "guild1",
            npcs: [
              {
                npcType: NpcType.COLOSSUS,
                allowedRarities: [ItemRarity.UNIQUE],
              },
            ],
          },
        ]);
        databaseCalls.loot.findUnique.mockResolvedValue(null);
        databaseCalls.npcSnapshot.findFirst.mockResolvedValue(null);
        databaseCalls.loot.create.mockResolvedValue({ id: 1 });

        await acceptance.accept({
          discordId,
          submission: {
            ...mockCreateLootDto,
            loots,
            players,
            npcs: [standardColossus],
          },
        });

        expect(databaseCalls.loot.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            lootShare: {},
            lootShareSource: "NONE",
          }),
        });
      },
    );

    it("should return a retryable error when loot lock contention outlasts the wait", async () => {
      vi.spyOn(acceptance["redlock"], "acquire").mockRejectedValue(
        new ExecutionError("Lock contention", []),
      );

      await expect(
        acceptance.accept({ discordId, submission: mockCreateLootDto }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it("should return existing loot when it already exists", async () => {
      const mockLoot = { id: 1, uniqueId: "unique123" };
      databaseCalls.loot.findUnique.mockResolvedValue(mockLoot);

      const result = await acceptance.accept({
        discordId,
        submission: mockCreateLootDto,
      });

      expect(databaseCalls.loot.findUnique).toHaveBeenCalled();
      expect(databaseCalls.loot.create).not.toHaveBeenCalled();
      expect(lootStatsService.invalidateCache).toHaveBeenCalledWith(["guild1"]);
      expect(playersService.bulkIndexPlayers).not.toHaveBeenCalled();
      expect(npcsService.bulkIndexNpcs).not.toHaveBeenCalled();
      expect(result).toEqual(expectedSuccessResponse);
    });

    it("should not publish create event when existing loot submission already exists", async () => {
      const mockLoot = { id: 1, uniqueId: "unique123" };
      databaseCalls.loot.findUnique.mockResolvedValue(mockLoot);
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([
        {
          id: 10,
          guildId: "guild1",
          submissions: [{ memberId: "member1" }],
        },
      ]);

      await acceptance.accept({ discordId, submission: mockCreateLootDto });

      expect(databaseCalls.lootSubmission.createMany).not.toHaveBeenCalled();
      expect(amqpConnection.publish).not.toHaveBeenCalledWith(
        expect.any(String),
        RoutingKey.GUILDS_LOOTS_CREATE,
        expect.any(Object),
      );
      expect(lootStatsService.invalidateCache).not.toHaveBeenCalled();
    });

    it("should publish create event only for newly persisted existing loot submissions", async () => {
      const mockLoot = { id: 1, uniqueId: "unique123" };
      const secondGuild = {
        ...mockGuild,
        id: "guild2",
        name: "Second Guild",
      };
      databaseCalls.loot.findUnique.mockResolvedValue(mockLoot);
      guildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        mockGuild,
        secondGuild,
      ]);
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1", "guild2"],
      } as never);
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([
        {
          id: "guild1",
          npcs: [
            {
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
            },
          ],
        },
        {
          id: "guild2",
          npcs: [
            {
              npcType: NpcType.ELITE,
              allowedRarities: [ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
            },
          ],
        },
      ]);
      databaseCalls.member.findMany.mockResolvedValue([
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
      databaseCalls.organizationLootRecord.findMany
        .mockResolvedValueOnce([
          {
            id: 10,
            guildId: "guild1",
            submissions: [{ memberId: "member1" }],
          },
        ])
        .mockResolvedValueOnce([{ id: 20, guildId: "guild2" }]);

      await acceptance.accept({ discordId, submission: mockCreateLootDto });

      expect(databaseCalls.lootSubmission.createMany).toHaveBeenCalledWith({
        data: [
          {
            organizationLootRecordId: 20,
            memberId: "member2",
          },
        ],
        skipDuplicates: true,
      });
      expect(databaseCalls.$transaction).toHaveBeenCalledTimes(1);
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        RoutingKey.GUILDS_LOOTS_CREATE,
        {
          version: 2,
          guildId: "guild2",
          lootId: mockLoot.id,
          npcs: [
            {
              lvl: 50,
              prof: Profession.WARRIOR,
              type: NpcType.ELITE,
              wt: 10,
            },
          ],
        },
      );
      expect(amqpConnection.publish).not.toHaveBeenCalledWith(
        expect.any(String),
        RoutingKey.GUILDS_LOOTS_CREATE,
        expect.objectContaining({
          guildId: "guild1",
          lootId: mockLoot.id,
        }),
      );
    });

    it("should throw BadRequestException when no valid configs found", async () => {
      userLootlogConfigService.getLootlogCharacterConfig.mockResolvedValue({
        catchingGuildIds: ["guild1"],
      } as never);
      lootlogConfigService.getMultipleLootlogConfigs.mockResolvedValue([]);
      databaseCalls.loot.findUnique.mockResolvedValue(null);

      await expect(
        acceptance.accept({ discordId, submission: mockCreateLootDto }),
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

      expect(databaseCalls.loot.create).not.toHaveBeenCalled();
      expect(databaseCalls.lootSubmission.createMany).not.toHaveBeenCalled();
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
      databaseCalls.loot.findUnique.mockResolvedValue(null);

      await expect(
        acceptance.accept({ discordId, submission: mockCreateLootDto }),
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

      expect(databaseCalls.loot.create).not.toHaveBeenCalled();
      expect(databaseCalls.lootSubmission.createMany).not.toHaveBeenCalled();
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

      databaseCalls.member.findMany.mockResolvedValue([
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
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue(mockLoot);

      const result = await acceptance.accept({
        discordId,
        submission: mockCreateLootDto,
      });

      expect(databaseCalls.loot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationLootRecords: {
              create: [
                {
                  guildId: "guild1",
                  submissions: { create: { memberId: "member1" } },
                },
                {
                  guildId: "guild2",
                  submissions: { create: { memberId: "member2" } },
                },
              ],
            },
          }),
        }),
      );
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

      databaseCalls.member.findMany.mockResolvedValue([
        {
          id: "member1",
          guildId: "guild1",
          userId: discordId,
        },
      ]);

      const mockLoot = { id: 1, uniqueId: "unique123" };
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue(mockLoot);

      const result = await acceptance.accept({
        discordId,
        submission: mockCreateLootDto,
      });

      expect(
        lootlogConfigService.getMultipleLootlogConfigs,
      ).toHaveBeenCalledWith(["guild1"]);
      expect(databaseCalls.loot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationLootRecords: {
              create: [
                {
                  guildId: "guild1",
                  submissions: { create: { memberId: "member1" } },
                },
              ],
            },
          }),
        }),
      );
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

      databaseCalls.member.findMany.mockResolvedValue([
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
      databaseCalls.loot.findUnique.mockResolvedValue(null);
      databaseCalls.loot.create.mockResolvedValue(mockLoot);

      const result = await acceptance.accept({
        discordId,
        submission: mockCreateLootDto,
      });

      expect(databaseCalls.loot.create).toHaveBeenCalled();
      expect(databaseCalls.loot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationLootRecords: {
              create: [
                {
                  guildId: "guild2",
                  submissions: { create: { memberId: "member2" } },
                },
              ],
            },
          }),
        }),
      );
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
        acceptance.accept({ discordId, submission: mockCreateLootDto }),
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
      guild: mockGuild,
      lootId: 1,
      accessPolicy: policy(Permission.LOOTLOG_LOOTS_READ),
      roles: [] as Role[],
    };

    it("should return comments for loot", async () => {
      vi.spyOn(service["lootQueryService"], "fetchLootById").mockResolvedValue({
        id: options.lootId,
      } as never);
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
      databaseCalls.lootComment.findMany.mockResolvedValue(mockComments);

      const result = await service.getComments(options);

      expect(databaseCalls.lootComment.findMany).toHaveBeenCalledWith({
        where: {
          organizationLootRecord: {
            guildId: options.guild.id,
            lootId: options.lootId,
            archivedAt: null,
          },
        },
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
      expect(result).toEqual([
        {
          ...mockComments[0],
          guildId: options.guild.id,
          lootId: options.lootId,
          createdAt: undefined,
          updatedAt: undefined,
        },
      ]);
    });
  });

  describe("archiveLoot", () => {
    const options = {
      discordId: "discord123",
      guild: mockGuild,
      lootId: 1,
      accessPolicy: policy(Permission.LOOTLOG_LOOTS_ARCHIVE),
      roles: [] as Role[],
    };

    it("archives only the Organization Loot record and preserves submissions", async () => {
      vi.spyOn(service["lootQueryService"], "fetchLootById").mockResolvedValue({
        id: 1,
      } as never);
      databaseCalls.member.findUnique.mockResolvedValue({ id: 42 });
      databaseCalls.organizationLootRecord.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.archiveLoot(options);

      expect(
        databaseCalls.organizationLootRecord.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId: mockGuild.id,
          lootId: options.lootId,
          archivedAt: null,
        },
        data: {
          archivedAt: expect.any(Date),
          archivedByMemberId: 42,
        },
      });
      expect(databaseCalls.lootSubmission.deleteMany).not.toHaveBeenCalled();
      expect(lootStatsService.invalidateCache).toHaveBeenCalledWith([
        mockGuild.id,
      ]);
    });

    it("conceals a loot outside the caller visibility", async () => {
      vi.spyOn(service["lootQueryService"], "fetchLootById").mockResolvedValue(
        null,
      );

      await expect(service.archiveLoot(options)).rejects.toThrow(
        new NotFoundException(ErrorKey.CANT_DELETE_LOOT),
      );
    });

    it("rejects an already archived Organization Loot record", async () => {
      vi.spyOn(service["lootQueryService"], "fetchLootById").mockResolvedValue({
        id: 1,
      } as never);
      databaseCalls.member.findUnique.mockResolvedValue({ id: 42 });
      databaseCalls.organizationLootRecord.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(service.archiveLoot(options)).rejects.toThrow(
        new NotFoundException(ErrorKey.CANT_DELETE_LOOT),
      );
      expect(lootStatsService.invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe("createComment", () => {
    const options = {
      discordId: "discord123",
      userId: "user123",
      guild: mockGuild,
      lootId: 1,
      body: { content: "Test comment" } as CreateCommentDto,
      accessPolicy: policy(Permission.LOOTLOG_LOOTS_READ),
      roles: [] as Role[],
    };

    it("should create comment when loot exists", async () => {
      vi.spyOn(service["lootQueryService"], "fetchLootById").mockResolvedValue({
        id: options.lootId,
      } as never);
      const mockComment = {
        id: "comment1",
        content: "Test comment",
        createdAt: new Date("2026-08-29T00:00:00.000Z"),
        updatedAt: new Date("2026-08-29T00:00:00.000Z"),
        member: {
          name: "Test User",
          avatar: null,
          userId: "user123",
          roles: [],
        },
      };
      databaseCalls.organizationLootRecord.findFirst.mockResolvedValue({
        id: 10,
      });
      databaseCalls.lootComment.create.mockResolvedValue(mockComment);

      const result = await service.createComment(options);

      expect(databaseCalls.lootComment.create).toHaveBeenCalled();
      expect(result).toEqual({
        ...mockComment,
        guildId: options.guild.id,
        lootId: options.lootId,
      });
    });

    it("should conceal a loot that is not visible", async () => {
      vi.spyOn(service["lootQueryService"], "fetchLootById").mockResolvedValue(
        null,
      );

      await expect(service.createComment(options)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("LootAllocationService", () => {
    const actorUserId = "user123";
    const lootId = 1;
    const updateData: UpdateLootDto = {
      msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
    };

    it("should confirm an inferred item-owner share from a valid chat message", async () => {
      const mockLoot = {
        id: 1,
        lootShare: { "1123": ["abc123"] },
        lootShareSource: "ITEM_OWNER",
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
        lootNpcs: [
          {
            npcSnapshot: {
              lvl: 50,
              prof: Profession.WARRIOR,
              type: NpcType.ELITE,
              wt: 10,
            },
          },
        ],
        organizationLootRecords: [{ guildId: "guild1" }],
      };
      databaseCalls.loot.findFirst.mockResolvedValue(mockLoot);

      const result = await allocation.confirmFromChat({
        actorUserId,
        lootId,
        message: updateData.msg,
      });

      expect(databaseCalls.loot.updateMany).toHaveBeenCalledWith({
        where: {
          id: lootId,
          organizationLootRecords: {
            some: {
              submissions: {
                some: {
                  member: { globalUserId: actorUserId },
                  createdAt: { gte: expect.any(Date) },
                },
              },
            },
          },
          lootShareSource: { not: "CHAT_MESSAGE" },
        },
        data: {
          lootShare: { "1123": ["abc123"] },
          lootShareSource: "CHAT_MESSAGE",
        },
      });
      expect(result).toEqual({});
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        "guilds.loots.share.update",
        {
          version: 2,
          guildId: "guild1",
          lootId,
          lootShare: { "1123": ["abc123"] },
          npcs: [
            {
              lvl: 50,
              prof: Profession.WARRIOR,
              type: NpcType.ELITE,
              wt: 10,
            },
          ],
        },
      );
    });

    it("should acknowledge an identical existing chat loot share without side effects", async () => {
      const existingLootShare = { "1123": ["abc123"] };
      databaseCalls.loot.findFirst.mockResolvedValue({
        id: lootId,
        lootShare: existingLootShare,
        lootShareSource: "CHAT_MESSAGE",
        lootPlayers: [
          {
            lvl: 50,
            playerSnapshot: {
              characterId: 1,
              accountId: 123,
              name: "Test Player",
              prof: Profession.WARRIOR,
              icon: "player.png",
            },
          },
        ],
        lootItems: [
          {
            hid: "abc123",
            itemSnapshot: {
              itemId: 1,
              name: "Test Item",
              icon: "item.png",
              statRaw: "lvl=50;rarity=UNIQUE",
              lvl: 50,
              rarity: ItemRarity.UNIQUE,
              itemType: "WEAPON",
            },
          },
        ],
        lootNpcs: [],
        organizationLootRecords: [{ guildId: "guild1" }],
      });

      const result = await allocation.confirmFromChat({
        actorUserId,
        lootId,
        message: updateData.msg,
      });

      expect(result).toEqual({});
      expect(databaseCalls.loot.findFirst.mock.calls[0]?.[0]?.where).toEqual({
        id: lootId,
        organizationLootRecords: {
          some: {
            submissions: {
              some: expect.objectContaining({
                member: { globalUserId: actorUserId },
                createdAt: { gte: expect.any(Date) },
              }),
            },
          },
        },
      });
      expect(databaseCalls.loot.updateMany).not.toHaveBeenCalled();
      expect(_redisService.deleteByPattern).not.toHaveBeenCalled();
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it("rejects a conflicting chat loot share without overwriting the winner", async () => {
      databaseCalls.loot.findFirst.mockResolvedValue({
        id: lootId,
        lootShare: { "different-player": ["abc123"] },
        lootShareSource: "CHAT_MESSAGE",
        lootPlayers: [
          {
            lvl: 50,
            playerSnapshot: {
              characterId: 1,
              accountId: 123,
              name: "Test Player",
              prof: Profession.WARRIOR,
              icon: "player.png",
            },
          },
        ],
        lootItems: [
          {
            hid: "abc123",
            itemSnapshot: {
              itemId: 1,
              name: "Test Item",
              icon: "item.png",
              statRaw: "lvl=50;rarity=UNIQUE",
              lvl: 50,
              rarity: ItemRarity.UNIQUE,
              itemType: "WEAPON",
            },
          },
        ],
        lootNpcs: [],
        organizationLootRecords: [{ guildId: "guild1" }],
      });

      await expect(
        allocation.confirmFromChat({
          actorUserId,
          lootId,
          message: updateData.msg,
        }),
      ).rejects.toThrow(ConflictException);

      expect(databaseCalls.loot.updateMany).not.toHaveBeenCalled();
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it("should return the winning loot share after losing a concurrent update", async () => {
      const emptyShareLoot = {
        id: lootId,
        lootShare: {},
        lootShareSource: "NONE",
        lootPlayers: [
          {
            lvl: 50,
            playerSnapshot: {
              characterId: 1,
              accountId: 123,
              name: "Test Player",
              prof: Profession.WARRIOR,
              icon: "player.png",
            },
          },
        ],
        lootItems: [
          {
            hid: "abc123",
            itemSnapshot: {
              itemId: 1,
              name: "Test Item",
              icon: "item.png",
              statRaw: "lvl=50;rarity=UNIQUE",
              lvl: 50,
              rarity: ItemRarity.UNIQUE,
              itemType: "WEAPON",
            },
          },
        ],
        lootNpcs: [],
        organizationLootRecords: [{ guildId: "guild1" }],
      };
      databaseCalls.loot.findFirst
        .mockResolvedValueOnce(emptyShareLoot)
        .mockResolvedValueOnce({
          lootShare: { "1123": ["abc123"] },
          lootShareSource: "CHAT_MESSAGE",
        });
      databaseCalls.loot.updateMany.mockResolvedValue({ count: 0 });

      const result = await allocation.confirmFromChat({
        actorUserId,
        lootId,
        message: updateData.msg,
      });

      expect(result).toEqual({});
      expect(_redisService.deleteByPattern).not.toHaveBeenCalled();
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it("should return a retryable error when a lost update still has an empty share", async () => {
      const emptyShareLoot = {
        id: lootId,
        lootShare: {},
        lootShareSource: "NONE",
        lootPlayers: [
          {
            lvl: 50,
            playerSnapshot: {
              characterId: 1,
              accountId: 123,
              name: "Test Player",
              prof: Profession.WARRIOR,
              icon: "player.png",
            },
          },
        ],
        lootItems: [
          {
            hid: "abc123",
            itemSnapshot: {
              itemId: 1,
              name: "Test Item",
              icon: "item.png",
              statRaw: "lvl=50;rarity=UNIQUE",
              lvl: 50,
              rarity: ItemRarity.UNIQUE,
              itemType: "WEAPON",
            },
          },
        ],
        lootNpcs: [],
        organizationLootRecords: [{ guildId: "guild1" }],
      };
      databaseCalls.loot.findFirst
        .mockResolvedValueOnce(emptyShareLoot)
        .mockResolvedValueOnce({ lootShareSource: "NONE" });
      databaseCalls.loot.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        allocation.confirmFromChat({
          actorUserId,
          lootId,
          message: updateData.msg,
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(_redisService.deleteByPattern).not.toHaveBeenCalled();
      expect(amqpConnection.publish).not.toHaveBeenCalled();
    });

    it("should publish loot share update once per guild", async () => {
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
        lootNpcs: [
          {
            npcSnapshot: {
              lvl: 50,
              prof: Profession.WARRIOR,
              type: NpcType.ELITE,
              wt: 10,
            },
          },
        ],
        organizationLootRecords: [{ guildId: "guild1" }, { guildId: "guild1" }],
      };

      databaseCalls.loot.findFirst.mockResolvedValue(mockLoot);

      await allocation.confirmFromChat({
        actorUserId,
        lootId,
        message: updateData.msg,
      });

      expect(amqpConnection.publish).toHaveBeenCalledTimes(1);
      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        RoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
        expect.objectContaining({
          guildId: "guild1",
          lootId,
        }),
      );
    });

    it("should route loot share update by highest tier npc", async () => {
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
        lootNpcs: [
          {
            npcSnapshot: {
              lvl: 50,
              prof: Profession.WARRIOR,
              type: NpcType.ELITE,
              wt: 10,
            },
          },
          {
            npcSnapshot: {
              lvl: 120,
              prof: Profession.WARRIOR,
              type: NpcType.TITAN,
              wt: 100,
            },
          },
        ],
        organizationLootRecords: [{ guildId: "guild1" }],
      };

      databaseCalls.loot.findFirst.mockResolvedValue(mockLoot);

      await allocation.confirmFromChat({
        actorUserId,
        lootId,
        message: updateData.msg,
      });

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        expect.any(String),
        RoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
        expect.objectContaining({
          version: 2,
          npcs: expect.arrayContaining([
            expect.objectContaining({ type: NpcType.TITAN, lvl: 120 }),
          ]),
        }),
      );
    });

    it("should throw ForbiddenException when loot not found", async () => {
      databaseCalls.loot.findFirst.mockResolvedValue(null);

      await expect(
        allocation.confirmFromChat({
          actorUserId,
          lootId,
          message: updateData.msg,
        }),
      ).rejects.toThrow(new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT));
    });

    it("should throw BadRequestException when no loot share found in message", async () => {
      const mockLoot = {
        id: 1,
        lootShare: {},
        lootPlayers: [],
        lootItems: [],
      };
      databaseCalls.loot.findFirst.mockResolvedValue(mockLoot);

      const invalidUpdateData = { msg: "Invalid message" };

      await expect(
        allocation.confirmFromChat({
          actorUserId,
          lootId,
          message: invalidUpdateData.msg,
        }),
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

    const getLastOrganizationLootWhere = () => {
      const lastCall =
        databaseCalls.organizationLootRecord.findMany.mock.calls.at(-1) as
          | [{ where?: { loot?: unknown } }]
          | undefined;

      return lastCall?.[0].where?.loot;
    };

    it("should return loots with submissions", async () => {
      const mockSubmissions = [
        {
          memberId: 10,
          member: {
            name: "Test User",
            avatar: "avatar.png",
            userId: "user123",
          },
        },
      ];

      const mockOrganizationRecords = [
        {
          lootId: 1,
          submissions: mockSubmissions,
          _count: { comments: 0 },
          loot: {
            id: 1,
            uniqueId: "unique1",
            world: "testworld",
            source: LootSource.FIGHT,
            location: "Test Location",
            lootShare: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            lootItems: [],
            lootPlayers: [],
            lootNpcs: [],
          },
        },
      ];

      databaseCalls.organizationLootRecord.findMany.mockResolvedValue(
        mockOrganizationRecords,
      );

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        policy(),
        [],
        params,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        uniqueId: "unique1",
        submissions: mockSubmissions,
      });
      expect(
        databaseCalls.organizationLootRecord.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            guildId: mockGuild.id,
            archivedAt: null,
            loot: expect.objectContaining({ world: "testworld" }),
          }),
          orderBy: { lootId: "desc" },
          take: params.limit,
        }),
      );
      expect(databaseCalls.loot.findMany).not.toHaveBeenCalled();
    });

    it("should keep cursor and role visibility within the Organization Loot query", async () => {
      const role: Role = {
        id: "role1",
        name: "Loot Reader",
        color: 0,
        position: 1,
        permissions: [Permission.LOOTLOG_LOOTS_READ],
        lvlRangeFrom: 10,
        lvlRangeTo: 60,
        guildId: mockGuild.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([]);

      await service.fetchLootsByGuildId(
        mockGuild,
        policy(Permission.LOOTLOG_LOOTS_READ),
        [role],
        { ...params, cursor: 123 },
      );

      expect(lootQueryRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          guildId: mockGuild.id,
          roles: [role],
          filters: expect.objectContaining({
            cursor: 123,
            world: "testworld",
          }),
        }),
      );
    });

    it("should revive cached loot dates before returning first page results", async () => {
      const cachedLoot = {
        id: 1,
        uniqueId: "unique1",
        world: "testworld",
        source: LootSource.FIGHT,
        location: "Test Location",
        lootShare: {},
        createdAt: "2026-01-01T10:00:00.000Z",
        updatedAt: "2026-01-01T10:05:00.000Z",
        items: [],
        players: [],
        npcs: [],
        submissions: [],
        commentsCount: 0,
      };

      _redisService.getOrSetJsonBestEffort.mockResolvedValue([cachedLoot]);

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        policy(),
        [],
        params,
      );

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.createdAt.toISOString()).toBe(cachedLoot.createdAt);
      expect(result[0]?.updatedAt).toBeInstanceOf(Date);
      expect(result[0]?.updatedAt.toISOString()).toBe(cachedLoot.updatedAt);
      expect(databaseCalls.loot.findMany).not.toHaveBeenCalled();
    });

    it("should return empty array when no loots found", async () => {
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([]);

      const result = await service.fetchLootsByGuildId(
        mockGuild,
        policy(),
        [],
        params,
      );

      expect(result).toEqual([]);
      expect(databaseCalls.lootComment.groupBy).not.toHaveBeenCalled();
    });

    it("should apply ranged loot filters to the repository query", async () => {
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([]);

      await service.fetchLootsByGuildId(mockGuild, policy(), [], {
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

      expect(lootQueryRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            npcLevelMin: 10,
            npcLevelMax: 20,
            itemLevelMin: 30,
            itemLevelMax: 40,
            playerLevelMin: 50,
            playerLevelMax: 60,
            createdAtMin: "2024-01-01T00:00:00.000Z",
            createdAtMax: "2024-01-31T23:59:59.999Z",
          }),
        }),
      );
    });

    it("should apply item profession filters to the repository query", async () => {
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([]);

      await service.fetchLootsByGuildId(mockGuild, policy(), [], {
        ...params,
        professions: [Profession.HUNTER, Profession.TRACKER, "INVALID"],
      });

      expect(lootQueryRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            professions: [Profession.HUNTER, Profession.TRACKER, "INVALID"],
          }),
        }),
      );
    });

    it("should ignore invalid item profession filters", async () => {
      databaseCalls.organizationLootRecord.findMany.mockResolvedValue([]);

      await service.fetchLootsByGuildId(mockGuild, policy(), [], {
        ...params,
        professions: ["INVALID"],
      });

      expect(getLastOrganizationLootWhere()).not.toEqual(
        expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              lootItems: expect.objectContaining({
                some: expect.objectContaining({
                  itemSnapshot: expect.objectContaining({
                    OR: expect.any(Array),
                  }),
                }),
              }),
            }),
          ]),
        }),
      );
    });

    it("should use item profession filters when counting loots", async () => {
      databaseCalls.loot.count.mockResolvedValue(0);

      await service.countLootsByGuildId(mockGuild, policy(), [], {
        ...params,
        professions: [Profession.HUNTER],
      });

      expect(lootQueryRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({
            professions: [Profession.HUNTER],
          }),
        }),
      );
    });
  });

  describe("resolveLootItemByHid", () => {
    const role: Role = {
      id: "role1",
      name: "Loot Reader",
      color: 0,
      position: 1,
      permissions: [Permission.LOOTLOG_LOOTS_READ],
      lvlRangeFrom: 10,
      lvlRangeTo: 60,
      guildId: mockGuild.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should resolve a visible item by HID without loading full loot payloads", async () => {
      databaseCalls.loot.findFirst.mockResolvedValue({
        lootItems: [
          {
            hid: "abc123",
            itemSnapshot: {
              itemId: 100,
              name: "Test Item",
              icon: "item.png",
              lvl: null,
              rarity: ItemRarity.LEGENDARY,
              itemType: "weapon",
              statRaw: "lvl=50;reqp=w",
            },
          },
        ],
      });

      const result = await service.resolveLootItemByHid(
        mockGuild,
        policy(Permission.LOOTLOG_LOOTS_READ),
        [role],
        { hid: "abc123", world: "testworld" },
      );

      expect(lootQueryRepository.resolveItemByHid).toHaveBeenCalledWith({
        guildId: mockGuild.id,
        permissions: [Permission.LOOTLOG_LOOTS_READ],
        roles: [role],
        hid: "abc123",
        world: "testworld",
      });
      expect(result).toEqual({
        id: 100,
        hid: "abc123",
        name: "Test Item",
        icon: "item.png",
        stat: "lvl=50;reqp=w",
        type: "weapon",
        rarity: ItemRarity.LEGENDARY,
        lvl: 50,
        prof: [Profession.WARRIOR],
      });
    });

    it("should return null when HID is blank", async () => {
      const result = await service.resolveLootItemByHid(
        mockGuild,
        policy(Permission.LOOTLOG_LOOTS_READ),
        [role],
        { hid: "   ", world: "testworld" },
      );

      expect(result).toBeNull();
      expect(databaseCalls.loot.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("fetchLootById", () => {
    const lootId = 1;
    const role: Role = {
      id: "role1",
      name: "Loot Reader",
      color: 0,
      position: 1,
      permissions: [Permission.LOOTLOG_LOOTS_READ],
      lvlRangeFrom: 10,
      lvlRangeTo: 60,
      guildId: mockGuild.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should apply guild and role visibility filters to the repository query", async () => {
      const mockLoot = {
        id: lootId,
        uniqueId: "unique1",
        world: "testworld",
        source: LootSource.FIGHT,
        location: "Test Location",
        lootShare: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationLootRecords: [{ submissions: [], _count: { comments: 0 } }],
        lootItems: [],
        lootPlayers: [],
        lootNpcs: [],
      };

      databaseCalls.loot.findFirst.mockResolvedValue(mockLoot);
      const result = await service.fetchLootById(
        mockGuild,
        policy(Permission.LOOTLOG_LOOTS_READ),
        [role],
        lootId,
      );

      expect(lootQueryRepository.findOne).toHaveBeenCalledWith({
        guildId: mockGuild.id,
        permissions: [Permission.LOOTLOG_LOOTS_READ],
        roles: [role],
        filters: { lootId },
      });
      expect(result).toMatchObject({
        id: lootId,
        uniqueId: "unique1",
        commentsCount: 0,
      });
    });

    it("should return null when loot is missing or not visible", async () => {
      databaseCalls.loot.findFirst.mockResolvedValue(null);

      const result = await service.fetchLootById(
        mockGuild,
        policy(Permission.LOOTLOG_LOOTS_READ),
        [role],
        lootId,
      );

      expect(result).toBeNull();
      expect(databaseCalls.lootComment.count).not.toHaveBeenCalled();
    });
  });
});
