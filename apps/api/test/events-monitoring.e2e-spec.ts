import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { TestDatabase } from "./test-database.js";
import { Permission } from "@lootlog/schema/permissions";
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
  let database: TestDatabase;
  let redis: RedisService;

  beforeAll(async () => {
    ({ app, database, redis } = await createE2EApp());
  });

  afterAll(async () => {
    await closeE2EApp(app, database);
  });

  beforeEach(async () => {
    await resetEventsTimersState(database, redis);
  });

  it("covers coverage gaps, active gaps, presence stats, respawn config and kill timeline", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_MANAGE,
      ],
    });
    const { event, hero, map } = await createEventFixture(database, {
      guildId: guild.id,
    });
    const { kill } = await createKillFixture(database, {
      eventId: event.id,
      heroNpcId: hero.id,
      member,
    });
    await database.eventMapCoverageGap.create({
      data: {
        mapId: map.id,
        heroNpcId: hero.id,
        gapType: "UNASSIGNED",
        startedAt: new Date(Date.now() - 600_000),
        endedAt: null,
        hadAssignedMembers: false,
      },
    });
    await database.eventMapAssignmentHistory.create({
      data: {
        mapId: map.id,
        heroNpcId: hero.id,
        memberId: member.id,
        assignedAt: new Date(Date.now() - 900_000),
      },
    });
    await database.eventPresenceLog.create({
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
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_MANAGE],
    });
    const { event, hero } = await createEventFixture(database, {
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
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_MANAGE,
      ],
    });
    const { event, hero } = await createEventFixture(database, {
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
    const guild = await createGuildFixture(database);
    const { event, hero } = await createEventFixture(database, {
      guildId: guild.id,
    });
    await createMemberFixture(database, {
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
