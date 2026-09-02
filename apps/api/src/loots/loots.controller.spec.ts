import { BadRequestException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Mock } from "vitest";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import {
  LootSourceEnum as LootSource,
  ProfessionEnum as Profession,
} from "@lootlog/schema/loot";
import { Permission } from "@lootlog/schema/permissions";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { mockFn } from "#src/test/mock-fn";
import { CreateCommentDto } from "./dto/create-comment-dto.js";
import { CreateLootDto } from "./dto/create-loot.dto.js";
import { FetchLootsParamsDto } from "./dto/fetch-loots-params.dto.js";
import { LootStatsQueryDto } from "./dto/loot-stats.dto.js";
import { ResolveLootItemParamsDto } from "./dto/resolve-loot-item-params.dto.js";
import { UpdateLootDto } from "./dto/update-loot.dto.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import { LootAllocationService } from "./loot-allocation.service.js";
import { LootSubmissionAcceptanceService } from "./loot-submission-acceptance.service.js";
import { LootsController } from "./loots.controller.js";
import { LootsService } from "./loots.service.js";
import { LootStatsService } from "./services/loot-stats.service.js";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

describe("LootsController", () => {
  let controller: LootsController;
  let allocation: { confirmFromChat: Mock };
  let acceptance: { accept: Mock };
  let service: {
    fetchLootsByGuildId: Mock;
    resolveLootItemByHid: Mock;
    fetchLootById: Mock;
    getComments: Mock;
    createComment: Mock;
    archiveLoot: Mock;
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

  const mockRole: Role = {
    id: "role1",
    name: "Test Role",
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_LOOTS_READ],
    lvlRangeFrom: 1,
    lvlRangeTo: 100,
    guildId: "guild1",
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
        wt: 1000,
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
    const mockLootsService = {
      fetchLootsByGuildId: mockFn(),
      resolveLootItemByHid: mockFn(),
      fetchLootById: mockFn(),
      getComments: mockFn(),
      createComment: mockFn(),
      archiveLoot: mockFn(),
    };
    const mockLootAllocation = { confirmFromChat: mockFn() };
    const mockLootSubmissionAcceptance = { accept: mockFn() };

    const mockLootStatsService = {
      getLootStats: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LootsController],
      providers: [
        { provide: LootAllocationService, useValue: mockLootAllocation },
        {
          provide: LootSubmissionAcceptanceService,
          useValue: mockLootSubmissionAcceptance,
        },
        { provide: LootsService, useValue: mockLootsService },
        { provide: LootStatsService, useValue: mockLootStatsService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LootsController>(LootsController);
    allocation = module.get(LootAllocationService);
    acceptance = module.get(LootSubmissionAcceptanceService);
    service = module.get(LootsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(controller).toBeDefined();
    });
  });

  describe("runtime DTO metadata", () => {
    it("should preserve zod dto classes for decorated params", () => {
      const fetchLootsParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "fetchLootsByGuildId",
      );
      const getLootStatsParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "getLootStats",
      );
      const createLootParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "createLoot",
      );
      const createCommentParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "createComment",
      );
      const resolveLootItemParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "resolveLootItemByHid",
      );
      const updateLootParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "updateLoot",
      );

      expect(fetchLootsParamTypes[3]).toBe(FetchLootsParamsDto);
      expect(getLootStatsParamTypes[3]).toBe(LootStatsQueryDto);
      expect(createLootParamTypes[1]).toBe(CreateLootDto);
      expect(createCommentParamTypes[2]).toBe(CreateCommentDto);
      expect(resolveLootItemParamTypes[3]).toBe(ResolveLootItemParamsDto);
      expect(updateLootParamTypes[1]).toBe(UpdateLootDto);
    });
  });

  describe("createLoot", () => {
    const discordId = "discord123";
    const mockResult = {
      id: 1,
      submittedGuilds: [
        {
          guildId: "guild1",
          guildName: "Test Guild",
        },
      ],
      rejectedGuilds: [],
    };

    it("should create a new loot", async () => {
      acceptance.accept.mockResolvedValue(mockResult);

      const result = await controller.createLoot(discordId, mockCreateLootDto);

      expect(acceptance.accept).toHaveBeenCalledWith({
        discordId,
        submission: mockCreateLootDto,
      });
      expect(result).toEqual(mockResult);
    });

    it("should handle service errors", async () => {
      acceptance.accept.mockRejectedValue(
        new BadRequestException(ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT),
      );

      await expect(
        controller.createLoot(discordId, mockCreateLootDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should handle concurrent requests correctly", async () => {
      acceptance.accept.mockResolvedValue(mockResult);

      const requests = Array(5)
        .fill(null)
        .map(() => controller.createLoot(discordId, mockCreateLootDto));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result).toEqual(mockResult));
      expect(acceptance.accept).toHaveBeenCalledTimes(5);
    });
  });

  describe("fetchLootsByGuildId", () => {
    const params = {
      cursor: null,
      limit: 10,
      npcTypes: [],
      npcs: [],
      players: [],
      rarities: [],
      world: "testworld",
    };

    it("should fetch loots for guild", async () => {
      const accessPolicy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });
      const mockLoots = [
        {
          id: 1,
          uniqueId: "unique1",
          submissions: [
            {
              member: {
                name: "Test User",
                avatar: "avatar.png",
                userId: "user123",
              },
            },
          ],
        },
      ];
      service.fetchLootsByGuildId.mockResolvedValue(mockLoots);

      const result = await controller.fetchLootsByGuildId(
        accessPolicy,
        [mockRole],
        mockGuild,
        params,
      );

      expect(service.fetchLootsByGuildId).toHaveBeenCalledWith(
        mockGuild,
        accessPolicy,
        [mockRole],
        params,
      );
      expect(result).toEqual(mockLoots);
    });

    it("should handle empty results", async () => {
      service.fetchLootsByGuildId.mockResolvedValue([]);

      const result = await controller.fetchLootsByGuildId(
        createAccessPolicy({
          capabilities: [Permission.LOOTLOG_LOOTS_READ],
        }),
        [mockRole],
        mockGuild,
        params,
      );

      expect(result).toEqual([]);
    });
  });

  describe("resolveLootItemByHid", () => {
    it("should resolve a visible loot item by HID", async () => {
      const accessPolicy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });
      const query = { hid: "item1", world: "testworld" };
      const mockItem = {
        id: 1,
        hid: "item1",
        name: "Test Item",
        icon: "item.png",
        stat: "lvl=50",
        type: null,
        rarity: null,
        lvl: 50,
        prof: [Profession.WARRIOR],
      };

      service.resolveLootItemByHid.mockResolvedValue(mockItem);

      const result = await controller.resolveLootItemByHid(
        accessPolicy,
        [mockRole],
        mockGuild,
        query,
      );

      expect(service.resolveLootItemByHid).toHaveBeenCalledWith(
        mockGuild,
        accessPolicy,
        [mockRole],
        query,
      );
      expect(result).toEqual(mockItem);
    });
  });

  describe("fetchLootById", () => {
    const lootId = 1;

    it("should fetch loot by id for guild with member visibility context", async () => {
      const accessPolicy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });
      const mockLoot = {
        id: lootId,
        uniqueId: "unique1",
      };

      service.fetchLootById.mockResolvedValue(mockLoot);

      const result = await controller.fetchLootById(
        lootId,
        accessPolicy,
        [mockRole],
        mockGuild,
      );

      expect(service.fetchLootById).toHaveBeenCalledWith(
        mockGuild,
        accessPolicy,
        [mockRole],
        lootId,
      );
      expect(result).toEqual(mockLoot);
    });
  });

  describe("getComments", () => {
    const lootId = 1;

    it("should get comments for loot", async () => {
      const accessPolicy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });
      const mockComments = [
        {
          id: 1,
          content: "Test comment",
          createdAt: new Date(),
          updatedAt: new Date(),
          lootId: 1,
          memberId: 1,
          guildId: "guild1",
          member: {
            name: "Test User",
            avatar: "avatar.png",
            userId: "user123",
            roles: [{ color: 16711680 }],
          },
        },
      ];
      service.getComments.mockResolvedValue(mockComments as never);

      const result = await controller.getComments(
        lootId,
        accessPolicy,
        [],
        mockGuild,
      );

      expect(service.getComments).toHaveBeenCalledWith({
        lootId,
        guild: mockGuild,
        accessPolicy,
        roles: [],
      });
      expect(result).toEqual(mockComments);
    });
  });

  describe("createComment", () => {
    const discordId = "discord123";
    const lootId = 1;
    const body: CreateCommentDto = { content: "Test comment" };

    it("should create a comment", async () => {
      const accessPolicy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_READ],
      });
      const mockComment = {
        id: 1,
        content: "Test comment",
        createdAt: new Date(),
        updatedAt: new Date(),
        lootId: 1,
        memberId: 1,
        guildId: "guild1",
      };
      service.createComment.mockResolvedValue(mockComment);

      const result = await controller.createComment(
        discordId,
        lootId,
        body,
        accessPolicy,
        [],
        mockGuild,
      );

      expect(service.createComment).toHaveBeenCalledWith({
        discordId,
        lootId,
        body,
        guild: mockGuild,
        accessPolicy,
        roles: [],
      });
      expect(result).toEqual(mockComment);
    });
  });

  describe("deleteLoot", () => {
    const lootId = 1;

    it("should archive an Organization Loot record", async () => {
      const discordId = "discord123";
      const accessPolicy = createAccessPolicy({
        capabilities: [Permission.LOOTLOG_LOOTS_ARCHIVE],
      });
      const roles = [mockRole];
      service.archiveLoot.mockResolvedValue(undefined);

      await controller.deleteLoot(
        discordId,
        lootId,
        accessPolicy,
        roles,
        mockGuild,
      );

      expect(service.archiveLoot).toHaveBeenCalledWith({
        discordId,
        guild: mockGuild,
        lootId,
        accessPolicy,
        roles,
      });
    });
  });

  describe("updateLoot", () => {
    const userId = "user123";
    const lootId = 1;
    const body: UpdateLootDto = {
      msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
    };

    it("should update a loot", async () => {
      allocation.confirmFromChat.mockResolvedValue({});

      const result = await controller.updateLoot(userId, body, lootId);

      expect(allocation.confirmFromChat).toHaveBeenCalledWith({
        actorUserId: userId,
        lootId,
        message: body.msg,
      });
      expect(result).toEqual({});
    });
  });
});
