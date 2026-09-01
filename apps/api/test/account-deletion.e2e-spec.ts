import { HttpService } from "@nestjs/axios";
import type { INestApplication } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Test } from "@nestjs/testing";
import { RedisService } from "@lootlog/nest-shared/redis";
import { of } from "rxjs";
import request from "supertest";
import { vi } from "vitest";
import { db as prismaDb } from "../src/prisma/db.js";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/db/prisma.service.js";
import { createMockAmqpConnection } from "./test-module-helpers.js";

import { dateToTemporal } from "../src/db/temporal.js";
import { insertDatabaseFixture } from "./database-fixtures.js";
import { attachRolesToMembers } from "../src/members/member-roles.repository.js";
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];

describe("Account Deletion E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  const battlelogHttpMock = {
    post: vi.fn(() => of({ data: { status: "ACCEPTED" } })),
  };

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
      .overrideProvider(HttpService)
      .useValue(battlelogHttpMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    redis = app.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (prisma) {
    }
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  beforeEach(async () => {
    battlelogHttpMock.post.mockClear();

    await prisma.db
      .runtime()
      .execute(
        prisma.db.raw
          .sql`TRUNCATE TABLE "Guild", "Role", "Member", "UserKillStats", "NpcKillStats", "GuildKillSummary", "UserCharactersLootlogSettings", "UserSettings" CASCADE`
          .affectedCount()
          .build(),
      );
    await redis.deleteByPattern("auth:idp-token:*");
    await redis.deleteByPattern("user-lootlog-config:*");
    await redis.deleteByPattern("perms:*");
  });

  it("removes discord-keyed stats after account recreation while keeping guild unique kills intact", async () => {
    const guild = await insertDatabaseFixture(prisma, "Guild", {
      updatedAt: dateToTemporal(new Date()),
      ...{
        id: "guild-delete-test",
        name: "Delete Test Guild",
        ownerId: viewerUser.discordId,
        active: true,
      },
    });

    await insertDatabaseFixture(prisma, "UserSettings", {
      updatedAt: dateToTemporal(new Date()),
      ...{
        userId: deletedUser.oldAuthUserId,
        guildsOrder: [guild.id],
        hiddenGuildIds: [],
      },
    });

    const viewerMember = await insertDatabaseFixture(prisma, "Member", {
      updatedAt: dateToTemporal(new Date()),
      ...{
        userId: viewerUser.discordId,
        guildId: guild.id,
        name: "Viewer",
        globalUserId: viewerUser.authUserId,
        active: true,
        lastDiscordSyncAt: new Date(),
        lastDiscordStatus: "SUCCESS",
      },
    });

    const deletedMember = await insertDatabaseFixture(prisma, "Member", {
      updatedAt: dateToTemporal(new Date()),
      ...{
        userId: deletedUser.discordId,
        guildId: guild.id,
        name: "Deleted User",
        globalUserId: deletedUser.oldAuthUserId,
        active: true,
        lastDiscordSyncAt: new Date(),
        lastDiscordStatus: "SUCCESS",
      },
    });

    await insertDatabaseFixture(prisma, "UserKillStats", {
      updatedAt: dateToTemporal(new Date()),
      ...{
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

    await insertDatabaseFixture(prisma, "UserCharactersLootlogSettings", {
      updatedAt: dateToTemporal(new Date()),
      ...{
        userId: deletedUser.discordId,
        accountId: "12345",
        characterId: "67890",
        catchingGuildIds: [guild.id],
      },
    });

    await insertDatabaseFixture(prisma, "NpcKillStats", {
      updatedAt: dateToTemporal(new Date()),
      ...{
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

    await insertDatabaseFixture(prisma, "GuildKillSummary", {
      updatedAt: dateToTemporal(new Date()),
      ...{
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

    expect(battlelogHttpMock.post).toHaveBeenCalledWith(
      expect.stringContaining("/internal/delete-user-data"),
      { userId: deletedUser.oldAuthUserId },
      { timeout: 5000 },
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
        prisma.db.orm.public.UserKillStats.where((row) =>
          row.userId.eq(deletedUser.discordId),
        ).all(),
        prisma.db.orm.public.UserCharactersLootlogSettings.where((row) =>
          row.userId.eq(deletedUser.discordId),
        ).all(),
        prisma.db.orm.public.UserSettings.where((row) =>
          row.userId.eq(deletedUser.oldAuthUserId),
        ).first(),
      ]);

    expect(remainingUserStats).toEqual([]);
    expect(remainingLootlogConfig).toEqual([]);
    expect(remainingUserSettings).toBeNull();

    const updatedDeletedMemberRow = await prisma.db.orm.public.Member.where(
      (row) => row.id.eq(deletedMember.id),
    ).first();
    const updatedViewerMember = await prisma.db.orm.public.Member.where((row) =>
      row.id.eq(viewerMember.id),
    ).first();

    expect(updatedDeletedMemberRow).not.toBeNull();
    expect(updatedViewerMember).not.toBeNull();
    const [updatedDeletedMember] = await attachRolesToMembers(prisma.db, [
      updatedDeletedMemberRow!,
    ]);

    expect(updatedDeletedMember.active).toBe(false);
    expect(updatedDeletedMember.lastDiscordStatus).toBe("ACCOUNT_DELETED");
    expect(updatedDeletedMember.roles).toEqual([]);
    expect(updatedViewerMember.active).toBe(true);

    const remainingGuildParticipations =
      await prisma.db.orm.public.NpcKillStats.where((row) =>
        row.guildId.eq(guild.id),
      ).all();

    expect(remainingGuildParticipations).toEqual([]);
  });
});
