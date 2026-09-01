import type { INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { PrismaService } from "../src/db/prisma.service.js";
import { db as prismaDb } from "../src/prisma/db.js";
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

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

describe("Events Assignment E2E", () => {
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

  it("covers member assignment and self assignment flows", async () => {
    const guild = await createGuildFixture(prisma);
    const { member } = await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_MANAGE,
        Permission.LOOTLOG_EVENTS_WRITE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });
    const { event, map } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    await createTimerFixture(prisma, {
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
      prisma.db.orm.public.EventMapAssignmentHistory.where((row) =>
        row.mapId.eq(map.id),
      )
        .where((row) => row.memberId.eq(member.id))
        .where((row) => row.unassignedAt.isNull())
        .aggregate((aggregate) => ({ count: aggregate.count() }))
        .then(({ count }) => count),
    ).resolves.toBe(1);

    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${event.id}/maps/${map.id}/assign`,
      ),
    ).expect(200);
    await expect(
      prisma.db.orm.public.EventMapAssignmentHistory.where((row) =>
        row.mapId.eq(map.id),
      )
        .where((row) => row.unassignedAt.isNull())
        .aggregate((aggregate) => ({ count: aggregate.count() }))
        .then(({ count }) => count),
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
    const guild = await createGuildFixture(prisma);
    const { member } = await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_WRITE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });
    const { event, map } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    await createTimerFixture(prisma, {
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
      prisma.db.orm.public.EventMapAssignmentHistory.where((row) =>
        row.mapId.eq(map.id),
      )
        .where((row) => row.memberId.eq(member.id))
        .aggregate((aggregate) => ({ count: aggregate.count() }))
        .then(({ count }) => count),
    ).resolves.toBe(0);
  });

  it("covers hero, map, location and map-location mutations", async () => {
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [
        Permission.LOOTLOG_EVENTS_MANAGE,
        Permission.LOOTLOG_EVENTS_READ,
      ],
    });
    const { event, hero } = await createEventFixture(prisma, {
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
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_MANAGE],
    });
    const { event, hero, map } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    await createLocationFixture(prisma, { heroNpcId: hero.id, name: "Taken" });

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
    const guild = await createGuildFixture(prisma);
    const { event, map } = await createEventFixture(prisma, {
      guildId: guild.id,
    });
    await createMemberFixture(prisma, {
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
