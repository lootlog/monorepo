import { db as prismaDb } from "#src/prisma/db";
import { RedisService } from "@lootlog/nest-shared/redis";
import { Test, type TestingModule } from "@nestjs/testing";
import { POSTGRES_POOL } from "#src/db/postgres.provider";
import { GuildsService } from "#src/guilds/guilds.service";
import { mockFn } from "#src/test/mock-fn";
import { UserLootlogConfigService } from "./user-lootlog-config.service.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

describe("UserLootlogConfigService", () => {
  let service: UserLootlogConfigService;

  const postgres = { query: mockFn() };
  const guilds = { getGuildsForRequiredPermissions: mockFn() };
  const redis = { getOrSetJsonBestEffort: mockFn(), deleteByPattern: mockFn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLootlogConfigService,
        { provide: POSTGRES_POOL, useValue: postgres },
        { provide: GuildsService, useValue: guilds },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(UserLootlogConfigService);
    vi.clearAllMocks();
    guilds.getGuildsForRequiredPermissions.mockResolvedValue([]);
    redis.getOrSetJsonBestEffort.mockImplementation(
      ({ factory }: { factory: () => Promise<unknown> }) => factory(),
    );
    redis.deleteByPattern.mockResolvedValue(0);
  });

  it("filters account catching guilds by write access without mutating storage", async () => {
    postgres.query.mockResolvedValue({
      rows: [
        {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild4", "guild2"],
        },
      ],
    });
    guilds.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "guild1" },
      { id: "guild2" },
    ]);

    await expect(
      service.getLootlogAccountConfig("discord1", "account1"),
    ).resolves.toEqual({
      character1: {
        userId: "discord1",
        accountId: "account1",
        characterId: "character1",
        catchingGuildIds: ["guild1", "guild2"],
      },
    });
    expect(guilds.getGuildsForRequiredPermissions).toHaveBeenCalledWith(
      "discord1",
      [Permission.LOOTLOG_LOOTS_WRITE],
    );
  });

  it("reads character configuration from the current source", async () => {
    const config = {
      userId: "discord1",
      accountId: "account1",
      characterId: "character1",
      catchingGuildIds: ["guild1"],
    };
    postgres.query.mockResolvedValue({ rows: [config] });

    await expect(
      service.getLootlogCharacterConfig("discord1", "account1", "character1"),
    ).resolves.toEqual(config);
  });

  it("deduplicates requested players and exposes only accessible guilds", async () => {
    guilds.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "guild1", name: "Alpha" },
      { id: "guild2", name: "Beta" },
    ]);
    postgres.query.mockResolvedValue({
      rows: [
        {
          userId: "player-1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild3", "guild1"],
        },
        {
          userId: "player-2",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild2"],
        },
      ],
    });

    const result = await service.getPlayersCatchingGuilds("viewer", {
      players: [
        {
          userId: "player-1",
          accountId: "account1",
          characterId: "character1",
        },
        {
          userId: "player-1",
          accountId: "account1",
          characterId: "character1",
        },
        {
          userId: "player-2",
          accountId: "account1",
          characterId: "character1",
        },
        {
          userId: "player-3",
          accountId: "account3",
          characterId: "character3",
        },
      ],
    });

    expect(result.players).toEqual([
      {
        userId: "player-1",
        accountId: "account1",
        characterId: "character1",
        guilds: [{ id: "guild1", name: "Alpha" }],
      },
      {
        userId: "player-2",
        accountId: "account1",
        characterId: "character1",
        guilds: [{ id: "guild2", name: "Beta" }],
      },
      {
        userId: "player-3",
        accountId: "account3",
        characterId: "character3",
        guilds: [],
      },
    ]);
    expect(postgres.query).toHaveBeenCalledTimes(1);
  });

  it("does not query settings when the viewer has no accessible guilds", async () => {
    await expect(
      service.getPlayersCatchingGuilds("viewer", {
        players: [
          {
            userId: "player-1",
            accountId: "account1",
            characterId: "character1",
          },
        ],
      }),
    ).resolves.toEqual({
      players: [
        {
          userId: "player-1",
          accountId: "account1",
          characterId: "character1",
          guilds: [],
        },
      ],
    });
    expect(postgres.query).not.toHaveBeenCalled();
  });

  it("normalizes writable guilds and atomically upserts the configuration", async () => {
    guilds.getGuildsForRequiredPermissions.mockResolvedValue([
      { id: "guild1" },
      { id: "guild3" },
    ]);
    postgres.query.mockResolvedValue({
      rows: [
        {
          userId: "discord1",
          accountId: "account1",
          characterId: "character1",
          catchingGuildIds: ["guild1", "guild3"],
        },
      ],
    });

    const result = await service.createOrUpdateLootlogCharacterConfig(
      "discord1",
      "account1",
      {
        characterId: "character1",
        catchingGuildIds: ["guild1", "guild2", "guild1", "guild3"],
      },
    );

    expect(postgres.query).toHaveBeenCalledWith(expect.any(String), [
      "discord1",
      "account1",
      "character1",
      ["guild1", "guild3"],
    ]);
    expect(redis.deleteByPattern).toHaveBeenCalled();
    expect(result.catchingGuildIds).toEqual(["guild1", "guild3"]);
  });
});
