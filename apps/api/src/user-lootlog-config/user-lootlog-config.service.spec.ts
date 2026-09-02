import { Test, type TestingModule } from "@nestjs/testing";
import { GuildsService } from "#src/guilds/guilds.service";
import { Permission } from "@lootlog/schema/permissions";
import { mockFn } from "#src/test/mock-fn";
import { RedisService } from "@lootlog/nest-shared/redis";
import { UserLootlogConfigService } from "./user-lootlog-config.service.js";
import { UserLootlogConfigRepository } from "./user-lootlog-config.repository.js";

describe("UserLootlogConfigService", () => {
  let service: UserLootlogConfigService;

  const mockRepository = {
    findAccountConfig: mockFn(),
    findCharacterConfig: mockFn(),
    findPlayers: mockFn(),
    upsertCharacterConfig: mockFn(),
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
          provide: UserLootlogConfigRepository,
          useValue: mockRepository,
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
      mockRepository.findAccountConfig.mockResolvedValue([
        {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild4", "guild2"],
        },
      ]);
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
      expect(mockRepository.upsertCharacterConfig).not.toHaveBeenCalled();
    });
  });

  describe("getPlayersCatchingGuilds", () => {
    it("reads every batch from current source data after another player changes configuration", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
      ]);
      mockRepository.findPlayers
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
      expect(mockRepository.findPlayers).toHaveBeenCalledTimes(2);
    });

    it("deduplicates requested players and returns only shared accessible guilds", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
        { id: "guild2", name: "Beta" },
      ]);
      mockRepository.findPlayers.mockResolvedValue([
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
      ]);

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

      expect(mockRepository.findPlayers).toHaveBeenCalledWith(
        [
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
        ["guild1", "guild2"],
      );
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
      expect(mockRepository.findPlayers).not.toHaveBeenCalled();
    });

    it("keeps same account and character separated by user ID", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
        { id: "guild2", name: "Beta" },
      ]);
      mockRepository.findPlayers.mockResolvedValue([
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
      ]);

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
      mockRepository.upsertCharacterConfig.mockImplementation(
        (
          userId: string,
          accountId: string,
          characterId: string,
          catchingGuildIds: string[],
        ) => ({
          userId,
          accountId,
          characterId,
          catchingGuildIds,
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

      expect(mockRepository.upsertCharacterConfig).toHaveBeenCalledWith(
        "discord1",
        "account1",
        "character1",
        ["guild1", "guild4", "guild2", "guild3"],
      );

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
      mockRepository.upsertCharacterConfig.mockImplementation(
        (
          userId: string,
          accountId: string,
          characterId: string,
          catchingGuildIds: string[],
        ) => ({
          userId,
          accountId,
          characterId,
          catchingGuildIds,
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

      expect(mockRepository.upsertCharacterConfig).toHaveBeenCalledWith(
        "discord1",
        "account1",
        "character1",
        ["guild1", "guild3"],
      );

      expect(result.catchingGuildIds).toEqual(["guild1", "guild3"]);
    });
  });
});
