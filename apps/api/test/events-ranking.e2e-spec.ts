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
  createTimerFixture,
  FORBIDDEN_AUTH,
  resetEventsTimersState,
  TEST_AUTH,
  TEST_WORLD,
  withAuth,
} from "./events-timers-e2e-helpers.js";

describe("Events Ranking E2E", () => {
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

  it("covers ranking, timers, stats, histories, detail, edit history and point updates", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_WRITE,
        Permission.LOOTLOG_TIMERS_READ,
        Permission.OWNER,
      ],
    });
    const { event, hero } = await createEventFixture(database, {
      guildId: guild.id,
    });
    await createTimerFixture(database, {
      guildId: guild.id,
      memberId: member.id,
      world: TEST_WORLD,
    });
    const { kill, ranking, killPointId } = await createKillFixture(database, {
      eventId: event.id,
      heroNpcId: hero.id,
      member,
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/ranking`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer())
        .get(`/guilds/${guild.id}/events/${event.id}/timers`)
        .query({ world: TEST_WORLD }),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/hero-stats`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body[0].killCount).toBe(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/kills`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.data).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/members/${member.id}/kills`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.data).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/kills`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.data).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/kills/${kill.id}`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.kill.id).toBe(kill.id));

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/events/${event.id}/ranking/${ranking.id}`)
        .send({ pointsDelta: 2, comment: "bonus" }),
    )
      .expect(200)
      .expect((response) => expect(response.body.totalPoints).toBe(3));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/ranking`,
      ),
    )
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toEqual(
          expect.objectContaining({
            id: ranking.id,
            editHistory: [
              expect.objectContaining({
                rankingId: ranking.id,
                previousPoints: 1,
                newPoints: 3,
                deltaPoints: 2,
                comment: "bonus",
              }),
            ],
          }),
        );
      });

    await withAuth(
      request(app.getHttpServer())
        .patch(
          `/guilds/${guild.id}/events/${event.id}/kills/${kill.id}/points/${killPointId}`,
        )
        .send({ pointsDelta: 1, comment: "manual" }),
    ).expect(200);
  });

  it("covers pending and confirm participation", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_WRITE,
      ],
    });
    const { event, hero } = await createEventFixture(database, {
      guildId: guild.id,
      participationConfirmationMinutes: 10,
    });
    const { kill } = await createKillFixture(database, {
      eventId: event.id,
      heroNpcId: hero.id,
      member,
      confirmationDeadlineAt: new Date(Date.now() + 600_000),
      confirmedAt: null,
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/participation-confirmations/pending`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.items).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).post(
        `/guilds/${guild.id}/events/${event.id}/kills/${kill.id}/confirm-participation`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.confirmedNow).toBe(true));
  });

  it("rejects invalid ranking and kill requests", async () => {
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_READ, Permission.OWNER],
    });
    const { event, hero } = await createEventFixture(database, {
      guildId: guild.id,
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/members/not-a-number/kills`,
      ),
    ).expect(400);

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/kills/missing-kill`,
      ),
    ).expect(404);

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/events/${event.id}/ranking/missing-ranking`)
        .send({ pointsDelta: 1 }),
    ).expect(404);
  });

  it("enforces ranking permissions", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      auth: TEST_AUTH,
      permissions: [Permission.LOOTLOG_EVENTS_READ],
    });
    const { event, hero } = await createEventFixture(database, {
      guildId: guild.id,
    });
    const { ranking } = await createKillFixture(database, {
      eventId: event.id,
      heroNpcId: hero.id,
      member,
    });
    await createMemberFixture(database, {
      guildId: guild.id,
      auth: FORBIDDEN_AUTH,
      permissions: [],
    });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/ranking`,
      ),
      FORBIDDEN_AUTH,
    ).expect(403);

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/events/${event.id}/ranking/${ranking.id}`)
        .send({ pointsDelta: 1 }),
    ).expect(403);
  });
});
