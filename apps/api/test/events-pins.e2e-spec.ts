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
  createMemberFixture,
  resetEventsTimersState,
  withAuth,
} from "./events-timers-e2e-helpers.js";

describe("Event pins E2E", () => {
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

  it("pins and lists events through a vanity URL for an administrator", async () => {
    const guild = await createGuildFixture(database, {
      id: "guild-with-vanity",
      vanityUrl: "eventowa",
    });
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [Permission.ADMIN],
      type: "ADMIN",
    });
    const { event } = await createEventFixture(database, { guildId: guild.id });

    await withAuth(
      request(app.getHttpServer()).put(
        `/guilds/${guild.vanityUrl}/events/${event.id}/pin`,
      ),
    )
      .expect(200)
      .expect((response) => {
        expect(response.body.event).toMatchObject({
          id: event.id,
          guildId: guild.id,
          active: true,
        });
      });

    await withAuth(
      request(app.getHttpServer()).get(
        `/guilds/${guild.vanityUrl}/pinned-events`,
      ),
    )
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0].event.id).toBe(event.id);
      });
  });

  it("preserves concurrent pins and keeps repeated operations idempotent", async () => {
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_READ],
    });
    const [{ event: firstEvent }, { event: secondEvent }] = await Promise.all([
      createEventFixture(database, { guildId: guild.id, name: "First" }),
      createEventFixture(database, {
        guildId: guild.id,
        name: "Second",
        mapId: 5002,
      }),
    ]);

    await Promise.all([
      withAuth(
        request(app.getHttpServer()).put(
          `/guilds/${guild.id}/events/${firstEvent.id}/pin`,
        ),
      ).expect(200),
      withAuth(
        request(app.getHttpServer()).put(
          `/guilds/${guild.id}/events/${secondEvent.id}/pin`,
        ),
      ).expect(200),
    ]);

    await withAuth(
      request(app.getHttpServer()).put(
        `/guilds/${guild.id}/events/${firstEvent.id}/pin`,
      ),
    ).expect(200);

    expect(
      await database.userPinnedEvent.count({
        where: { userId: "e2e-user" },
      }),
    ).toBe(2);

    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${firstEvent.id}/pin`,
      ),
    ).expect(204);
    await withAuth(
      request(app.getHttpServer()).delete(
        `/guilds/${guild.id}/events/${firstEvent.id}/pin`,
      ),
    ).expect(204);

    expect(
      await database.userPinnedEvent.count({
        where: { userId: "e2e-user" },
      }),
    ).toBe(1);

    await database.event.delete({ where: { id: secondEvent.id } });
    expect(
      await database.userPinnedEvent.count({
        where: { userId: "e2e-user" },
      }),
    ).toBe(0);
  });

  it("rejects inactive, missing, and cross-guild events", async () => {
    const now = new Date();
    const guild = await createGuildFixture(database);
    const otherGuild = await createGuildFixture(database, {
      id: "other-guild",
      name: "Other Guild",
    });
    await createMemberFixture(database, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_READ],
    });
    const { event: upcomingEvent } = await createEventFixture(database, {
      guildId: guild.id,
      startsAt: new Date(now.getTime() + 60_000),
    });
    const { event: endedEvent } = await createEventFixture(database, {
      guildId: guild.id,
      name: "Ended",
      mapId: 5002,
      startsAt: new Date(now.getTime() - 120_000),
      endsAt: new Date(now.getTime() - 60_000),
    });
    const { event: otherEvent } = await createEventFixture(database, {
      guildId: otherGuild.id,
      mapId: 5003,
    });

    for (const eventId of [upcomingEvent.id, endedEvent.id]) {
      await withAuth(
        request(app.getHttpServer()).put(
          `/guilds/${guild.id}/events/${eventId}/pin`,
        ),
      ).expect(409);
    }

    for (const eventId of ["missing-event", otherEvent.id]) {
      await withAuth(
        request(app.getHttpServer()).put(
          `/guilds/${guild.id}/events/${eventId}/pin`,
        ),
      ).expect(404);
    }
  });

  it("requires event read permission", async () => {
    const guild = await createGuildFixture(database);
    await createMemberFixture(database, { guildId: guild.id });
    const { event } = await createEventFixture(database, { guildId: guild.id });

    await withAuth(
      request(app.getHttpServer()).put(
        `/guilds/${guild.id}/events/${event.id}/pin`,
      ),
    ).expect(403);
  });
});
