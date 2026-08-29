import { Test, type TestingModule } from "@nestjs/testing";
import { PrismaService } from "#src/db/prisma.service";
import { GuildsService } from "#src/guilds/guilds.service";
import { Permission } from "#src/generated/prisma/client";
import { mockFn } from "#src/test/mock-fn";
import { RedisService } from "@lootlog/nest-shared/redis";
import { UserLootlogConfigService } from "./user-lootlog-config.service.js";

describe("UserLootlogConfigService", () => {
  let service: UserLootlogConfigService;

  const mockPrismaService = {
    userCharactersLootlogSettings: {
      findMany: mockFn(),
      findFirst: mockFn(),
      update: mockFn(),
      upsert: mockFn(),
    },
  };
  const mockGuildsService = {
    getGuildsForRequiredPermissions: mockFn(),
  };
  const mockRedisService = {
    getOrSetJsonBestEffort: mockFn(),
    deleteByPattern: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLootlogConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<UserLootlogConfigService>(UserLootlogConfigService);

    vi.clearAllMocks();
    mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);
    mockRedisService.getOrSetJsonBestEffort.mockImplementation(
      ({ factory }: { factory: () => Promise<unknown> }) => factory(),
    );
    mockRedisService.deleteByPattern.mockResolvedValue(0);
  });

  describe("getLootlogAccountConfig", () => {
    it("returns only catching guild IDs where user has write access without pruning stored config", async () => {
      mockPrismaService.userCharactersLootlogSettings.findMany.mockResolvedValue(
        [
          {
            userId: "discord1",
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild1", "guild4", "guild2"],
          },
        ],
      );
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1" },
        { id: "guild2" },
      ]);

      const result = await service.getLootlogAccountConfig(
        "discord1",
        "account1",
      );

      expect(result).toEqual({
        character1: {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild2"],
        },
      });

      expect(
        mockGuildsService.getGuildsForRequiredPermissions,
      ).toHaveBeenCalledWith("discord1", [Permission.LOOTLOG_LOOTS_WRITE]);
      expect(
        mockPrismaService.userCharactersLootlogSettings.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe("getPlayersCatchingGuilds", () => {
    it("reads every batch from current source data after another player changes configuration", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            userId: "player-discord",
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild1"],
          },
        ]);
      const request = {
        players: [
          {
            userId: "player-discord",
            accountId: "account1",
            characterId: "character1",
          },
        ],
      };

      const beforeChange = await service.getPlayersCatchingGuilds(
        "viewer-discord",
        request,
      );
      const afterChange = await service.getPlayersCatchingGuilds(
        "viewer-discord",
        request,
      );

      expect(beforeChange.players[0]?.guilds).toEqual([]);
      expect(afterChange.players[0]?.guilds).toEqual([
        { id: "guild1", name: "Alpha" },
      ]);
      expect(mockRedisService.getOrSetJsonBestEffort).not.toHaveBeenCalled();
      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).toHaveBeenCalledTimes(2);
    });

    it("deduplicates requested players and returns only shared accessible guilds", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
        { id: "guild2", name: "Beta" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.findMany.mockResolvedValue(
        [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild1", "guild3", "guild1"],
          },
          {
            userId: "player-discord-2",
            accountId: "account2",
            characterId: "character2",
            catchingGuildIds: ["guild2"],
          },
        ],
      );

      const result = await service.getPlayersCatchingGuilds("viewer-discord", {
        players: [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
          },
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
          },
          {
            userId: "player-discord-2",
            accountId: "account2",
            characterId: "character2",
          },
          {
            userId: "player-discord-3",
            accountId: "account3",
            characterId: "character3",
          },
        ],
      });

      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              userId: "player-discord-1",
              accountId: "account1",
              characterId: "character1",
            },
            {
              userId: "player-discord-2",
              accountId: "account2",
              characterId: "character2",
            },
            {
              userId: "player-discord-3",
              accountId: "account3",
              characterId: "character3",
            },
          ],
          catchingGuildIds: {
            hasSome: ["guild1", "guild2"],
          },
        },
        select: {
          userId: true,
          accountId: true,
          characterId: true,
          catchingGuildIds: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(result).toEqual({
        players: [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
            guilds: [{ id: "guild1", name: "Alpha" }],
          },
          {
            userId: "player-discord-2",
            accountId: "account2",
            characterId: "character2",
            guilds: [{ id: "guild2", name: "Beta" }],
          },
          {
            userId: "player-discord-3",
            accountId: "account3",
            characterId: "character3",
            guilds: [],
          },
        ],
      });
    });

    it("returns empty guild lists without querying configs when viewer has no accessible Lootlog guilds", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);

      const result = await service.getPlayersCatchingGuilds("viewer-discord", {
        players: [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
          },
          {
            userId: "player-discord-2",
            accountId: "account2",
            characterId: "character2",
          },
        ],
      });

      expect(result).toEqual({
        players: [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
            guilds: [],
          },
          {
            userId: "player-discord-2",
            accountId: "account2",
            characterId: "character2",
            guilds: [],
          },
        ],
      });
      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).not.toHaveBeenCalled();
    });

    it("keeps same account and character separated by user ID", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
        { id: "guild2", name: "Beta" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.findMany.mockResolvedValue(
        [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild1"],
          },
          {
            userId: "player-discord-2",
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild2"],
          },
        ],
      );

      const result = await service.getPlayersCatchingGuilds("viewer-discord", {
        players: [
          {
            userId: "player-discord-1",
            accountId: "account1",
            characterId: "character1",
          },
          {
            userId: "player-discord-2",
            accountId: "account1",
            characterId: "character1",
          },
        ],
      });

      expect(result.players).toEqual([
        {
          userId: "player-discord-1",
          accountId: "account1",
          characterId: "character1",
          guilds: [{ id: "guild1", name: "Alpha" }],
        },
        {
          userId: "player-discord-2",
          accountId: "account1",
          characterId: "character1",
          guilds: [{ id: "guild2", name: "Beta" }],
        },
      ]);
    });
  });

  describe("createOrUpdateLootlogCharacterConfig", () => {
    it("deduplicates catchingGuildIds before persisting", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1" },
        { id: "guild2" },
        { id: "guild3" },
        { id: "guild4" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.upsert.mockImplementation(
        ({ create }: { create: { catchingGuildIds: string[] } }) => ({
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: create.catchingGuildIds,
        }),
      );

      const result = await service.createOrUpdateLootlogCharacterConfig(
        "discord1",
        "account1",
        {
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild4", "guild2", "guild2", "guild3"],
        },
      );

      expect(
        mockPrismaService.userCharactersLootlogSettings.upsert,
      ).toHaveBeenCalledWith({
        where: {
          userId_accountId_characterId: {
            userId: "discord1",
            accountId: "account1",
            characterId: "character1",
          },
        },
        update: {
          catchingGuildIds: ["guild1", "guild4", "guild2", "guild3"],
        },
        create: {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild4", "guild2", "guild3"],
        },
      });

      expect(result).toEqual({
        userId: "discord1",
        accountId: "account1",
        characterId: "character1",
        catchingGuildIds: ["guild1", "guild4", "guild2", "guild3"],
      });
    });

    it("filters out catchingGuildIds without write access before persisting", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1" },
        { id: "guild3" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.upsert.mockImplementation(
        ({ create }: { create: { catchingGuildIds: string[] } }) => ({
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: create.catchingGuildIds,
        }),
      );

      const result = await service.createOrUpdateLootlogCharacterConfig(
        "discord1",
        "account1",
        {
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild2", "guild2", "guild3"],
        },
      );

      expect(
        mockPrismaService.userCharactersLootlogSettings.upsert,
      ).toHaveBeenCalledWith({
        where: {
          userId_accountId_characterId: {
            userId: "discord1",
            accountId: "account1",
            characterId: "character1",
          },
        },
        update: {
          catchingGuildIds: ["guild1", "guild3"],
        },
        create: {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild3"],
        },
      });

      expect(result.catchingGuildIds).toEqual(["guild1", "guild3"]);
    });
  });
});
