import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { PrismaService } from "../src/db/prisma.service";
import { Permission } from "src/db/domain";
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
} from "./events-timers-e2e-helpers";

describe("Events Ranking E2E", () => {
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

  it("covers ranking, timers, stats, histories, detail, edit history and point updates", async () => {
    const guild = await createGuildFixture(prisma);
    const { member } = await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_WRITE,
        Permission.LOOTLOG_TIMERS_READ,
        Permission.OWNER,
      ],
    });
    const { event, hero } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    await createTimerFixture(prisma, {
      guildId: guild.id,
      memberId: member.id,
      world: TEST_WORLD,
    });
    const { kill, ranking, killPointId } = await createKillFixture(prisma, {
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
    const guild = await createGuildFixture(prisma);
    const { member } = await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_READ,
        Permission.LOOTLOG_EVENTS_WRITE,
      ],
    });
    const { event, hero } = await createEventFixture(prisma, {
      guildId: guild.id,
      participationConfirmationMinutes: 10,
    });
    const { kill } = await createKillFixture(prisma, {
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
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_READ, Permission.OWNER],
    });
    const { event, hero } = await createEventFixture(prisma, {
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
    const guild = await createGuildFixture(prisma);
    const { member } = await createMemberFixture(prisma, {
      guildId: guild.id,
      auth: TEST_AUTH,
      permissions: [Permission.LOOTLOG_EVENTS_READ],
    });
    const { event, hero } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    const { ranking } = await createKillFixture(prisma, {
      eventId: event.id,
      heroNpcId: hero.id,
      member,
    });
    await createMemberFixture(prisma, {
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
