import { BadRequestException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Mock } from "vitest";
import {
  LootSource,
  Permission,
  type Guild,
  type Role,
} from "src/generated/prisma/client";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { mockFn } from "src/test/mock-fn";
import { CreateCommentDto } from "./dto/create-comment-dto";
import { CreateLootDto } from "./dto/create-loot.dto";
import { FetchLootsParamsDto } from "./dto/fetch-loots-params.dto";
import { LootStatsQueryDto } from "./dto/loot-stats.dto";
import { UpdateLootDto } from "./dto/update-loot.dto";
import { ErrorKey } from "./enum/error-key.enum";
import { LootsController } from "./loots.controller";
import { LootsService } from "./loots.service";
import { LootStatsService } from "./services/loot-stats.service";

describe("LootsController", () => {
  let controller: LootsController;
  let service: {
    createLoot: Mock;
    fetchLootsByGuildId: Mock;
    getComments: Mock;
    createComment: Mock;
    deleteLoot: Mock;
    updateLoot: Mock;
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
      createLoot: mockFn(),
      fetchLootsByGuildId: mockFn(),
      getComments: mockFn(),
      createComment: mockFn(),
      deleteLoot: mockFn(),
      updateLoot: mockFn(),
    };

    const mockLootStatsService = {
      getLootStats: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LootsController],
      providers: [
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
      const updateLootParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        LootsController.prototype,
        "updateLoot",
      );

      expect(fetchLootsParamTypes[3]).toBe(FetchLootsParamsDto);
      expect(getLootStatsParamTypes[1]).toBe(LootStatsQueryDto);
      expect(createLootParamTypes[2]).toBe(CreateLootDto);
      expect(createCommentParamTypes[2]).toBe(CreateCommentDto);
      expect(updateLootParamTypes[1]).toBe(UpdateLootDto);
    });
  });

  describe("createLoot", () => {
    const discordId = "discord123";
    const userId = "user123";
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
      service.createLoot.mockResolvedValue(mockResult);

      const result = await controller.createLoot(
        discordId,
        userId,
        mockCreateLootDto,
      );

      expect(service.createLoot).toHaveBeenCalledWith(
        discordId,
        userId,
        mockCreateLootDto,
      );
      expect(result).toEqual(mockResult);
    });

    it("should handle service errors", async () => {
      service.createLoot.mockRejectedValue(
        new BadRequestException(ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT),
      );

      await expect(
        controller.createLoot(discordId, userId, mockCreateLootDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should handle concurrent requests correctly", async () => {
      service.createLoot.mockResolvedValue(mockResult);

      const requests = Array(5)
        .fill(null)
        .map(() => controller.createLoot(discordId, userId, mockCreateLootDto));

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result).toEqual(mockResult));
      expect(service.createLoot).toHaveBeenCalledTimes(5);
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
        [Permission.LOOTLOG_LOOTS_READ],
        [mockRole],
        mockGuild,
        params,
      );

      expect(service.fetchLootsByGuildId).toHaveBeenCalledWith(
        mockGuild,
        [Permission.LOOTLOG_LOOTS_READ],
        [mockRole],
        params,
      );
      expect(result).toEqual(mockLoots);
    });

    it("should handle empty results", async () => {
      service.fetchLootsByGuildId.mockResolvedValue([]);

      const result = await controller.fetchLootsByGuildId(
        [Permission.LOOTLOG_LOOTS_READ],
        [mockRole],
        mockGuild,
        params,
      );

      expect(result).toEqual([]);
    });
  });

  describe("getComments", () => {
    const lootId = 1;

    it("should get comments for loot", async () => {
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

      const result = await controller.getComments(lootId, mockGuild);

      expect(service.getComments).toHaveBeenCalledWith({
        lootId,
        guildId: mockGuild.id,
      });
      expect(result).toEqual(mockComments);
    });
  });

  describe("createComment", () => {
    const discordId = "discord123";
    const lootId = 1;
    const body: CreateCommentDto = { content: "Test comment" };

    it("should create a comment", async () => {
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
        mockGuild,
      );

      expect(service.createComment).toHaveBeenCalledWith({
        discordId,
        lootId,
        body,
        guildId: mockGuild.id,
      });
      expect(result).toEqual(mockComment);
    });
  });

  describe("deleteLoot", () => {
    const lootId = 1;

    it("should delete a loot", async () => {
      service.deleteLoot.mockResolvedValue(undefined);

      await controller.deleteLoot(lootId, mockGuild);

      expect(service.deleteLoot).toHaveBeenCalledWith({
        guildId: mockGuild.id,
        lootId,
      });
    });
  });

  describe("updateLoot", () => {
    const discordId = "discord123";
    const lootId = 1;
    const body: UpdateLootDto = {
      msg: 'Test Player otrzymał ITEM#abc123:"Test Item"',
    };

    it("should update a loot", async () => {
      const mockLootShare = { "1123": ["abc123"] };
      service.updateLoot.mockResolvedValue(mockLootShare);

      const result = await controller.updateLoot(discordId, body, lootId);

      expect(service.updateLoot).toHaveBeenCalledWith(discordId, lootId, body);
      expect(result).toEqual(mockLootShare);
    });
  });
});
