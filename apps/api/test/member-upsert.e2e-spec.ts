import type { INestApplication } from "@nestjs/common";
import type { APIGuildMember } from "discord-api-types/v10";
import { PrismaService } from "../src/db/prisma.service.js";
import { MemberDiscordSyncService } from "../src/members/member-discord-sync.service.js";
import { closeE2EApp, createE2EApp } from "./events-timers-e2e-helpers.js";
import { insertDatabaseFixture } from "./database-fixtures.js";

describe("Member upsert", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let memberSyncService: MemberDiscordSyncService;

  beforeAll(async () => {
    ({ app, prisma } = await createE2EApp());
    memberSyncService = app.get(MemberDiscordSyncService);
  });

  beforeEach(async () => {
    await prisma.db
      .runtime()
      .execute(
        prisma.db.raw.sql`TRUNCATE TABLE "Guild", "Member", "Role" CASCADE`
          .affectedCount()
          .build(),
      );
    await insertDatabaseFixture(prisma, "Guild", {
      id: "member-upsert-guild",
      name: "Member upsert guild",
      ownerId: "owner",
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    await closeE2EApp(app, prisma);
  });

  it("updates an existing Discord member without violating its composite unique index", async () => {
    const discordMember: APIGuildMember = {
      user: {
        id: "member-upsert-discord-user",
        username: "member",
        discriminator: "0",
        avatar: null,
        global_name: "First name",
      },
      nick: null,
      avatar: null,
      roles: [],
      joined_at: "2026-01-01T00:00:00.000Z",
      deaf: false,
      mute: false,
    };

    await memberSyncService.createOrUpdateMember({
      ...discordMember,
      guildId: "member-upsert-guild",
      globalUserId: "global-user",
    });
    await memberSyncService.createOrUpdateMember({
      ...discordMember,
      nick: "Updated name",
      guildId: "member-upsert-guild",
      globalUserId: "global-user",
    });

    const members = await prisma.db.orm.public.Member.where((row) =>
      row.guildId.eq("member-upsert-guild"),
    ).all();
    expect(members).toHaveLength(1);
    expect(members[0]?.name).toBe("Updated name");
  });
});
