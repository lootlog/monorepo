import { type INestApplication } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Test } from "@nestjs/testing";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { vi } from "vitest";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { AppModule } from "../src/app.module.js";
import { TestDatabase } from "./test-database.js";
import { createMockAmqpConnection } from "./test-module-helpers.js";

describe("Account Deletion E2E", () => {
  let app: INestApplication;
  let database: TestDatabase;
  let redis: RedisService;

  const battlelogFetchMock = vi.fn(async () =>
    Response.json({ status: "ACCEPTED" }),
  );

  const deletedUser = {
    oldAuthUserId: "auth-user-old",
    recreatedAuthUserId: "auth-user-new",
    discordId: "discord-target",
  };

  const viewerUser = {
    authUserId: "auth-viewer",
    discordId: "discord-viewer",
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AmqpConnection)
      .useValue(createMockAmqpConnection())
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();

    database = await new TestDatabase().initialize();
    redis = app.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (database) {
      await database.dispose();
    }
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  beforeEach(async () => {
    battlelogFetchMock.mockClear();
    vi.stubGlobal("fetch", battlelogFetchMock);

    await database.truncate(
      "Guild",
      "Role",
      "Member",
      "UserKillStats",
      "NpcKillStats",
      "GuildKillSummary",
      "UserCharactersLootlogSettings",
      "UserSettings",
    );
    await redis.deleteByPattern("auth:idp-token:*");
    await redis.deleteByPattern("user-lootlog-config:*");
    await redis.deleteByPattern("perms:*");
  });

  it("removes discord-keyed stats after account recreation while keeping guild unique kills intact", async () => {
    const guild = await database.guild.create({
      data: {
        id: "guild-delete-test",
        name: "Delete Test Guild",
        ownerId: viewerUser.discordId,
        active: true,
      },
    });

    await database.userSettings.create({
      data: {
        userId: deletedUser.oldAuthUserId,
        guildsOrder: [guild.id],
      },
    });

    const viewerMember = await database.member.create({
      data: {
        userId: viewerUser.discordId,
        guildId: guild.id,
        name: "Viewer",
        globalUserId: viewerUser.authUserId,
        active: true,
        lastDiscordSyncAt: new Date(),
        lastDiscordStatus: "SUCCESS",
      },
    });

    const deletedMember = await database.member.create({
      data: {
        userId: deletedUser.discordId,
        guildId: guild.id,
        name: "Deleted User",
        globalUserId: deletedUser.oldAuthUserId,
        active: true,
        lastDiscordSyncAt: new Date(),
        lastDiscordStatus: "SUCCESS",
      },
    });

    await database.userKillStats.create({
      data: {
        userId: deletedUser.discordId,
        world: "gordion",
        npcId: 379560,
        npcName: "Wabicielka",
        npcType: NpcType.ELITE2,
        npcLvl: 260,
        npcProf: "b",
        npcIcon: "e2/trist2_wabicielka-1a.gif",
        totalKills: 40,
      },
    });

    await database.userCharactersLootlogSettings.create({
      data: {
        userId: deletedUser.discordId,
        accountId: "12345",
        characterId: "67890",
        catchingGuildIds: [guild.id],
      },
    });

    await database.npcKillStats.create({
      data: {
        guildId: guild.id,
        memberId: deletedMember.id,
        userId: deletedUser.discordId,
        world: "gordion",
        npcId: 379560,
        npcName: "Wabicielka",
        npcType: NpcType.ELITE2,
        npcLvl: 260,
        npcProf: "b",
        npcIcon: "e2/trist2_wabicielka-1a.gif",
        memberKills: 40,
      },
    });

    await database.guildKillSummary.create({
      data: {
        guildId: guild.id,
        world: "gordion",
        npcId: 379560,
        npcName: "Wabicielka",
        npcType: NpcType.ELITE2,
        npcLvl: 260,
        npcProf: "b",
        npcIcon: "e2/trist2_wabicielka-1a.gif",
        uniqueKills: 40,
      },
    });

    await request(app.getHttpServer())
      .delete("/users/@me")
      .set("x-auth-user-id", deletedUser.oldAuthUserId)
      .set("x-auth-discord-id", deletedUser.discordId)
      .expect(200)
      .expect({ status: "OK" });

    expect(battlelogFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/internal/delete-user-data"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: deletedUser.oldAuthUserId }),
      }),
    );

    const personalStatsResponse = await request(app.getHttpServer())
      .get("/users/@me/stats/kills")
      .set("x-auth-user-id", deletedUser.recreatedAuthUserId)
      .set("x-auth-discord-id", deletedUser.discordId)
      .expect(200);

    expect(personalStatsResponse.body).toEqual({
      overview: {
        totalKills: 0,
        killsByType: {},
        killsByWorld: {},
      },
      topNpcs: [],
    });

    const guildStatsResponse = await request(app.getHttpServer())
      .get(`/guilds/${guild.id}/stats/kills`)
      .set("x-auth-user-id", viewerUser.authUserId)
      .set("x-auth-discord-id", viewerUser.discordId)
      .expect(200);

    expect(guildStatsResponse.body.overview).toEqual({
      guildUniqueKills: 40,
      totalMemberParticipations: 0,
      killsByType: {
        ELITE2: 40,
      },
      participationsByType: {},
    });
    expect(guildStatsResponse.body.memberRanking).toEqual([]);

    const [remainingUserStats, remainingLootlogConfig, remainingUserSettings] =
      await Promise.all([
        database.userKillStats.findMany({
          where: { userId: deletedUser.discordId },
        }),
        database.userCharactersLootlogSettings.findMany({
          where: { userId: deletedUser.discordId },
        }),
        database.userSettings.findUnique({
          where: { userId: deletedUser.oldAuthUserId },
        }),
      ]);

    expect(remainingUserStats).toEqual([]);
    expect(remainingLootlogConfig).toEqual([]);
    expect(remainingUserSettings).toBeNull();

    const updatedDeletedMember = await database.member.findUniqueOrThrow({
      where: { id: deletedMember.id },
      include: { roles: true },
    });
    const updatedViewerMember = await database.member.findUniqueOrThrow({
      where: { id: viewerMember.id },
    });

    expect(updatedDeletedMember.active).toBe(false);
    expect(updatedDeletedMember.lastDiscordStatus).toBe("ACCOUNT_DELETED");
    expect(updatedDeletedMember.roles).toEqual([]);
    expect(updatedViewerMember.active).toBe(true);

    const remainingGuildParticipations = await database.npcKillStats.findMany({
      where: { guildId: guild.id },
    });

    expect(remainingGuildParticipations).toEqual([]);
  });
});
