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
