import { Test, type TestingModule } from "@nestjs/testing";
import { RedisService } from "@lootlog/nest-shared";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission } from "src/generated/prisma/client";
import { mockFn } from "src/test/mock-fn";
import type { CreateOrUpdateLootlogCharacterConfigDto } from "src/user-lootlog-config/dto/create-user-account-config.dto";
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
    getUserGuildsWithPermissions: mockFn(),
  };

  const mockRedisService = {
    set: mockFn(),
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

    mockRedisService.set.mockResolvedValue("OK");
    mockRedisService.deleteByPattern.mockResolvedValue(1);
    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue([
      {
        guild: {
          id: "guild1",
          ownerId: "discord1",
        },
        roles: [],
      },
      {
        guild: {
          id: "guild2",
          ownerId: "another-user",
        },
        roles: [{ permissions: [Permission.LOOTLOG_TIMERS_WRITE] }],
      },
      {
        guild: {
          id: "guild3",
          ownerId: "another-user",
        },
        roles: [{ permissions: [Permission.LOOTLOG_LOOTS_WRITE] }],
      },
      {
        guild: {
          id: "guild4",
          ownerId: "another-user",
        },
        roles: [{ permissions: [] }],
      },
    ]);
  });

  describe("getLootlogAccountConfig", () => {
    it("returns deprecated aliases and cleans guild IDs without write access", async () => {
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
          collectLootWhitelistGuildIds: ["guild1", "guild2"],
          addTimersWhitelistGuildIds: ["guild1", "guild2"],
        },
      });

      expect(
        mockPrismaService.userCharactersLootlogSettings.update,
      ).toHaveBeenCalledWith({
        where: {
          userId_accountId_characterId: {
            userId: "discord1",
            accountId: "account1",
            characterId: "character1",
          },
        },
        data: {
          catchingGuildIds: ["guild1", "guild2"],
        },
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "user-lootlog-config:discord1:account1",
        JSON.stringify(result),
        3600,
      );
    });
  });

  describe("createOrUpdateLootlogCharacterConfig", () => {
    it("accepts deprecated payload fields and normalizes them into catchingGuildIds", async () => {
      mockPrismaService.userCharactersLootlogSettings.upsert.mockImplementation(
        async ({ create }: { create: { catchingGuildIds: string[] } }) => ({
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
          lootGuildIds: ["guild1", "guild4", "guild2"],
          timerGuildIds: ["guild2", "guild3", "guild4"],
        } as CreateOrUpdateLootlogCharacterConfigDto,
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
          catchingGuildIds: ["guild1", "guild2", "guild3"],
        },
        create: {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild2", "guild3"],
        },
      });

      expect(result).toEqual({
        userId: "discord1",
        accountId: "account1",
        characterId: "character1",
        catchingGuildIds: ["guild1", "guild2", "guild3"],
        collectLootWhitelistGuildIds: ["guild1", "guild2", "guild3"],
        addTimersWhitelistGuildIds: ["guild1", "guild2", "guild3"],
      });

      expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(
        "user-lootlog-config:discord1:account1:*",
      );
    });

    it("prefers catchingGuildIds when both new and deprecated fields are provided", async () => {
      mockPrismaService.userCharactersLootlogSettings.upsert.mockImplementation(
        async ({ create }: { create: { catchingGuildIds: string[] } }) => ({
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
          catchingGuildIds: ["guild2", "guild4", "guild2"],
          lootGuildIds: ["guild1"],
          timerGuildIds: ["guild3"],
        } as CreateOrUpdateLootlogCharacterConfigDto,
      );

      expect(
        mockPrismaService.userCharactersLootlogSettings.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            catchingGuildIds: ["guild2"],
          },
          create: expect.objectContaining({
            catchingGuildIds: ["guild2"],
          }),
        }),
      );

      expect(result).toEqual({
        userId: "discord1",
        accountId: "account1",
        characterId: "character1",
        catchingGuildIds: ["guild2"],
        collectLootWhitelistGuildIds: ["guild2"],
        addTimersWhitelistGuildIds: ["guild2"],
      });
    });
  });
});
