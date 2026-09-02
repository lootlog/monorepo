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
  createLocationFixture,
  createMemberFixture,
  createTimerFixture,
  FORBIDDEN_AUTH,
  resetEventsTimersState,
  withAuth,
} from "./events-timers-e2e-helpers.js";

describe("Events Assignment E2E", () => {
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

  it("covers member assignment and self assignment flows", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_MANAGE,
        Permission.LOOTLOG_EVENTS_WRITE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });
    const { event, map } = await createEventFixture(database, {
      guildId: guild.id,
    });
    await createTimerFixture(database, {
      guildId: guild.id,
      memberId: member.id,
      minSpawnTime: new Date(Date.now() + 4 * 60_000),
      maxSpawnTime: new Date(Date.now() + 30 * 60_000),
    });

    await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events/${event.id}/maps/${map.id}/assign`)
        .send({ memberId: member.id }),
    ).expect(201);
    await expect(
      database.eventMapAssignmentHistory.count({
        where: { mapId: map.id, memberId: member.id, unassignedAt: null },
      }),
    ).resolves.toBe(1);

    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/assign`,
      ),
    ).expect(200);
    await expect(
      database.eventMapAssignmentHistory.count({
        where: { mapId: map.id, unassignedAt: null },
      }),
    ).resolves.toBe(0);

    await withAuth(
      request(app.getHttpServer()).post(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/self-assign`,
      ),
    ).expect(201);
    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/self-assign`,
      ),
    ).expect(200);
  });

  it("rejects self assignment before the configured assignment window", async () => {
    const guild = await createGuildFixture(database);
    const { member } = await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_WRITE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });
    const { event, map } = await createEventFixture(database, {
      guildId: guild.id,
    });
    await createTimerFixture(database, {
      guildId: guild.id,
      memberId: member.id,
      minSpawnTime: new Date(Date.now() + 60 * 60_000),
      maxSpawnTime: new Date(Date.now() + 90 * 60_000),
    });

    await withAuth(
      request(app.getHttpServer()).post(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/self-assign`,
      ),
    ).expect(400);

    await expect(
      database.eventMapAssignmentHistory.count({
        where: { mapId: map.id, memberId: member.id },
      }),
    ).resolves.toBe(0);
  });

  it("covers hero, map, location and map-location mutations", async () => {
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_MANAGE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });
    const { event, hero } = await createEventFixture(database, {
      guildId: guild.id,
    });

    const heroResponse = await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events/${event.id}/heroes`)
        .send({
          npcName: "Second Hero",
          npcId: 2222,
          maps: [{ mapId: 7001, mapName: "Second Map" }],
        }),
    ).expect(201);
    const createdHeroId = heroResponse.body.id;

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/events/${event.id}/heroes/${createdHeroId}`)
        .send({ npcName: "Second Hero Updated" }),
    )
      .expect(200)
      .expect((response) =>
        expect(response.body.npcName).toBe("Second Hero Updated"),
      );

    const mapResponse = await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/maps`)
        .send({ mapId: 7002, mapName: "Added Map" }),
    ).expect(201);
    const createdMapId = mapResponse.body.id;

    const locationResponse = await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations`,
        )
        .send({ name: "North" }),
    ).expect(201);
    const locationId = locationResponse.body.id;

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations`,
      ),
    )
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await withAuth(
      request(app.getHttpServer())
        .patch(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations/${locationId}`,
        )
        .send({ name: "South" }),
    )
      .expect(200)
      .expect((response) => expect(response.body.name).toBe("South"));

    await withAuth(
      request(app.getHttpServer())
        .patch(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/maps/${createdMapId}/location`,
        )
        .send({ locationId }),
    ).expect(200);

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations/reorder`,
        )
        .send({ locationIds: [locationId] }),
    ).expect(200);

    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations/${locationId}`,
      ),
    ).expect(200);
    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/maps/${createdMapId}`,
      ),
    ).expect(200);
    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}/heroes/${createdHeroId}`,
      ),
    ).expect(200);
  });

  it("rejects invalid assignment and location requests", async () => {
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_MANAGE],
    });
    const { event, hero, map } = await createEventFixture(database, {
      guildId: guild.id,
    });
    await createLocationFixture(database, {
      heroNpcId: hero.id,
      name: "Taken",
    });

    await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events/${event.id}/maps/${map.id}/assign`)
        .send({ memberId: 999_999 }),
    ).expect(404);

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations`,
        )
        .send({ name: "Taken" }),
    ).expect(400);

    await withAuth(
      request(app.getHttpServer())
        .post(
          `/guilds/${guild.id}/events/${event.id}/heroes/${hero.id}/locations/reorder`,
        )
        .send({ locationIds: ["missing-location"] }),
    ).expect(400);
  });

  it("enforces assignment permissions", async () => {
    const guild = await createGuildFixture(database);
    const { event, map } = await createEventFixture(database, {
      guildId: guild.id,
    });
    await createMemberFixture(database, {
      guildId: guild.id,
      auth: FORBIDDEN_AUTH,
      permissions: [],
    });

    await withAuth(
      request(app.getHttpServer())
        .post(`/guilds/${guild.id}/events/${event.id}/maps/${map.id}/assign`)
        .send({ memberId: 1 }),
      FORBIDDEN_AUTH,
    ).expect(403);

    await withAuth(
      request(app.getHttpServer()).post(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/self-assign`,
      ),
      FORBIDDEN_AUTH,
    ).expect(403);
  });
});
