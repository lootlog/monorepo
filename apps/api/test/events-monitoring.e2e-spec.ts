import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { PrismaService } from "../src/db/prisma.service.js";
import { Permission } from "../src/generated/prisma/client.js";
import {
  closeE2EApp,
  createE2EApp,
  createEventFixture,
  createGuildFixture,
  createKillFixture,
  createMemberFixture,
  FORBIDDEN_AUTH,
  resetEventsTimersState,
  TEST_WORLD,
  withAuth,
} from "./events-timers-e2e-helpers.js";

describe("Events Monitoring E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    ({ app, prisma, redis } = await createE2EApp());
  });

  afterAll(async () => {
    await closeE2EApp(app, prisma);
  });

  beforeEach(async () => {
    await resetEventsTimersState(prisma, redis);
  });

  it("covers coverage gaps, active gaps, presence stats, respawn config and kill timeline", async () => {
    const guild = await createGuildFixture(prisma);
    const { member } = await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_MANAGE,
      ],
    });
    const { event, hero, map } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    const { kill } = await createKillFixture(prisma, {
      eventId: event.id,
      heroNpcId: hero.id,
      member,
    });
    await prisma.eventMapCoverageGap.create({
      data: {
        mapId: map.id,
        heroNpcId: hero.id,
        gapType: "UNASSIGNED",
        startedAt: new Date(Date.now() - 600_000),
        endedAt: null,
        hadAssignedMembers: false,
      },
    });
    await prisma.eventMapAssignmentHistory.create({
      data: {
        mapId: map.id,
        heroNpcId: hero.id,
        memberId: member.id,
        assignedAt: new Date(Date.now() - 900_000),
      },
    });
    await prisma.eventPresenceLog.create({
      data: {
        mapId: map.id,
        memberId: member.id,
        isAfk: false,
        startedAt: new Date(Date.now() - 300_000),
      },
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/coverage-gaps`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/coverage-gaps`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/active-gap`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.id).toBeTruthy());

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/active-gaps`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/presence-stats`,
      ),
    ).expect(200);

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/respawn-config`,
      ),
    ).expect(200);

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/kills/${kill.id}/timeline`,
      ),
    ).expect(200);
  });

  it("covers manual close and open respawn window", async () => {
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_MANAGE],
    });
    const { event, hero } = await createEventFixture(prisma, {
      guildId: guild.id,
      world: TEST_WORLD,
    });

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/open-respawn-window`,
        )
        .send({
          minSpawnTime: new Date(Date.now() + 600_000).toISOString(),
          maxSpawnTime: new Date(Date.now() + 900_000).toISOString(),
        }),
    )
      .expect(200)
      .expect((response) => expect(response.body.success).toBe(true));

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/close-respawn-window`,
        )
        .send({ createNewWindow: false }),
    )
      .expect(200)
      .expect((response) => expect(response.body.success).toBe(true));
  });

  it("rejects invalid monitoring requests", async () => {
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_MANAGE,
      ],
    });
    const { event, hero } = await createEventFixture(prisma, {
      guildId: guild.id,
      npcId: null,
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/kills/missing-kill/timeline`,
      ),
    ).expect(404);

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/open-respawn-window`,
        )
        .send({
          minSpawnTime: new Date(Date.now() + 900_000).toISOString(),
          maxSpawnTime: new Date(Date.now() + 600_000).toISOString(),
        }),
    ).expect(400);

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/close-respawn-window`,
        )
        .send({ createNewWindow: true }),
    ).expect(400);
  });

  it("enforces monitoring permissions", async () => {
    const guild = await createGuildFixture(prisma);
    const { event, hero } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    await createMemberFixture(prisma, {
      guildId: guild.id,
      auth: FORBIDDEN_AUTH,
      permissions: [],
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/coverage-gaps`,
      ),
      FORBIDDEN_AUTH,
    ).expect(403);

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/open-respawn-window`,
        )
        .send({
          minSpawnTime: new Date(Date.now() + 600_000).toISOString(),
          maxSpawnTime: new Date(Date.now() + 900_000).toISOString(),
        }),
      FORBIDDEN_AUTH,
    ).expect(403);
  });
});
