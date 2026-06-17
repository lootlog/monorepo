import { Test, type TestingModule } from "@nestjs/testing";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission } from "src/generated/prisma/client";
import { mockFn } from "src/test/mock-fn";
import { UserLootlogConfigService } from "./user-lootlog-config.service";

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
      ],
    }).compile();

    service = module.get<UserLootlogConfigService>(UserLootlogConfigService);

    vi.clearAllMocks();
    mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);
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

  describe("getPlayerCatchingGuilds", () => {
    it("returns only catching guilds where the requesting user has Lootlog access", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
        { id: "guild2", name: "Beta" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.findMany.mockResolvedValue(
        [
          {
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild1", "guild3", "guild2", "guild2"],
          },
        ],
      );

      const result = await service.getPlayerCatchingGuilds(
        "viewer-discord",
        "account1",
        "character1",
      );

      expect(
        mockGuildsService.getGuildsForRequiredPermissions,
      ).toHaveBeenCalledWith("viewer-discord", [Permission.LOOTLOG_ACCESS]);
      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).toHaveBeenCalledWith({
        where: {
          OR: [{ accountId: "account1", characterId: "character1" }],
          catchingGuildIds: {
            hasSome: ["guild1", "guild2"],
          },
        },
        select: {
          accountId: true,
          characterId: true,
          catchingGuildIds: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(result).toEqual({
        accountId: "account1",
        characterId: "character1",
        guilds: [
          { id: "guild1", name: "Alpha" },
          { id: "guild2", name: "Beta" },
        ],
      });
    });

    it("returns the same empty response when the requester has no accessible Lootlog guilds", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([]);

      const result = await service.getPlayerCatchingGuilds(
        "viewer-discord",
        "account1",
        "character1",
      );

      expect(result).toEqual({
        accountId: "account1",
        characterId: "character1",
        guilds: [],
      });
      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).not.toHaveBeenCalled();
    });

    it("returns the same empty response when player config does not overlap accessible guilds", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.findMany.mockResolvedValue(
        [],
      );

      const result = await service.getPlayerCatchingGuilds(
        "viewer-discord",
        "unknown-account",
        "unknown-character",
      );

      expect(result).toEqual({
        accountId: "unknown-account",
        characterId: "unknown-character",
        guilds: [],
      });
    });
  });

  describe("getPlayersCatchingGuilds", () => {
    it("deduplicates requested players and returns only shared accessible guilds", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild1", name: "Alpha" },
        { id: "guild2", name: "Beta" },
      ]);
      mockPrismaService.userCharactersLootlogSettings.findMany.mockResolvedValue(
        [
          {
            accountId: "account1",
            characterId: "character1",
            catchingGuildIds: ["guild1", "guild3", "guild1"],
          },
          {
            accountId: "account2",
            characterId: "character2",
            catchingGuildIds: ["guild2"],
          },
        ],
      );

      const result = await service.getPlayersCatchingGuilds("viewer-discord", {
        players: [
          { accountId: "account1", characterId: "character1" },
          { accountId: "account1", characterId: "character1" },
          { accountId: "account2", characterId: "character2" },
          { accountId: "account3", characterId: "character3" },
        ],
      });

      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).toHaveBeenCalledWith({
        where: {
          OR: [
            { accountId: "account1", characterId: "character1" },
            { accountId: "account2", characterId: "character2" },
            { accountId: "account3", characterId: "character3" },
          ],
          catchingGuildIds: {
            hasSome: ["guild1", "guild2"],
          },
        },
        select: {
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
            accountId: "account1",
            characterId: "character1",
            guilds: [{ id: "guild1", name: "Alpha" }],
          },
          {
            accountId: "account2",
            characterId: "character2",
            guilds: [{ id: "guild2", name: "Beta" }],
          },
          {
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
          { accountId: "account1", characterId: "character1" },
          { accountId: "account2", characterId: "character2" },
        ],
      });

      expect(result).toEqual({
        players: [
          { accountId: "account1", characterId: "character1", guilds: [] },
          { accountId: "account2", characterId: "character2", guilds: [] },
        ],
      });
      expect(
        mockPrismaService.userCharactersLootlogSettings.findMany,
      ).not.toHaveBeenCalled();
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
