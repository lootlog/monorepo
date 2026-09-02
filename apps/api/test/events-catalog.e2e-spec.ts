import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { TestDatabase } from "./test-database.js";
import { Permission } from "@lootlog/schema/permissions";
import {
  closeE2EApp,
  createE2EApp,
  createEventFixture,
  createEventPayload,
  createGuildFixture,
  createKillFixture,
  createMemberFixture,
  FORBIDDEN_AUTH,
  resetEventsTimersState,
  TEST_AUTH,
  TEST_WORLD,
  withAuth,
} from "./events-timers-e2e-helpers.js";

describe("Events Catalog E2E", () => {
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

  it("covers create, list, show, overview, maps, wrapped, update, recalculate and delete", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_MANAGE,
        Permission.LOOTLOG_EVENTS_READ,
        Permission.OWNER,
      ],
    });

    const createResponse = await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events`)
        .send(createEventPayload()),
    ).expect(201);
    const eventId = createResponse.body.id;
    expect(eventId).toBeTruthy();

    await withAuth(
      request(app.getHttpServer()).get(`/guilds/${guild.id}/events`),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer()).get(`/guilds/${guild.id}/events`).query({
        world: "other-world",
      }),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(0));

    await withAuth(
      request(app.getHttpServer()).get(`/guilds/${guild.id}/events/${eventId}`),
    )
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(eventId));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${eventId}/overview`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(eventId));

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${eventId}/maps`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.heroNpcs).toHaveLength(1));

    await createKillFixture(database, {
      eventId,
      heroNpcId: createResponse.body.heroNpcs[0].id,
      member,
    });
    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${eventId}/wrapped`,
      ),
    ).expect(200);

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/events/${eventId}`)
        .send({ name: "Updated E2E Event" }),
    )
      .expect(200)
      .expect((response) =>
        expect(response.body.name).toBe("Updated E2E Event"),
      );

    await withAuth(
      request(app.getHttpServer()).post(
        `/guilds/${guild.id}/events/${eventId}/recalculate-points`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.success).toBe(true));

    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${eventId}`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body.success).toBe(true));
    await expect(
      database.event.count({ where: { id: eventId } }),
    ).resolves.toBe(0);
  });

  it("rejects invalid create/update payloads and missing events", async () => {
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_MANAGE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });

    await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events`)
        .send({
          ...createEventPayload(),
          startsAt: "2026-01-02T00:00:00.000Z",
          endsAt: "2026-01-01T00:00:00.000Z",
        }),
    ).expect(400);

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/events/missing-event`)
        .send({ name: "Nope" }),
    ).expect(404);

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/missing-event`,
      ),
    ).expect(404);
  });

  it("enforces catalog permissions", async () => {
    const guild = await createGuildFixture(database);
    const { event } = await createEventFixture(database, {
      guildId: guild.id,
      world: TEST_WORLD,
    });
    await createMemberFixture(database, {
      guildId: guild.id,
      auth: FORBIDDEN_AUTH,
      permissions: [],
    });

    await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events`)
        .send(createEventPayload()),
      FORBIDDEN_AUTH,
    ).expect(403);

    await withAuth(
      request(app.getHttpServer()).get(`/guilds/${guild.id}/events`),
      FORBIDDEN_AUTH,
    ).expect(403);

    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}`,
      ),
      FORBIDDEN_AUTH,
    ).expect(403);
  });
});
