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
  createMemberFixture,
  resetEventsTimersState,
  withAuth,
} from "./events-timers-e2e-helpers.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

describe("Event pins E2E", () => {
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

  it("pins and lists events through a vanity URL for an administrator", async () => {
    const guild = await createGuildFixture(prisma, {
      id: "guild-with-vanity",
      vanityUrl: "eventowa",
    });
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [Permission.ADMIN],
      type: "ADMIN",
    });
    const { event } = await createEventFixture(prisma, { guildId: guild.id });

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
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_READ],
    });
    const [{ event: firstEvent }, { event: secondEvent }] = await Promise.all([
      createEventFixture(prisma, { guildId: guild.id, name: "First" }),
      createEventFixture(prisma, {
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
      (
        await prisma.db.orm.public.UserPinnedEvent.where((row) =>
          row.userId.eq("e2e-user"),
        ).aggregate((aggregate) => ({ count: aggregate.count() }))
      ).count,
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
      (
        await prisma.db.orm.public.UserPinnedEvent.where((row) =>
          row.userId.eq("e2e-user"),
        ).aggregate((aggregate) => ({ count: aggregate.count() }))
      ).count,
    ).toBe(1);

    await prisma.db.orm.public.Event.where((row) =>
      row.id.eq(secondEvent.id),
    ).delete();
    expect(
      (
        await prisma.db.orm.public.UserPinnedEvent.where((row) =>
          row.userId.eq("e2e-user"),
        ).aggregate((aggregate) => ({ count: aggregate.count() }))
      ).count,
    ).toBe(0);
  });

  it("rejects inactive, missing, and cross-guild events", async () => {
    const now = new Date();
    const guild = await createGuildFixture(prisma);
    const otherGuild = await createGuildFixture(prisma, {
      id: "other-guild",
      name: "Other Guild",
    });
    await createMemberFixture(prisma, {
      guildId: guild.id,
      permissions: [Permission.LOOTLOG_EVENTS_READ],
    });
    const { event: upcomingEvent } = await createEventFixture(prisma, {
      guildId: guild.id,
      startsAt: new Date(now.getTime() + 60_000),
    });
    const { event: endedEvent } = await createEventFixture(prisma, {
      guildId: guild.id,
      name: "Ended",
      mapId: 5002,
      startsAt: new Date(now.getTime() - 120_000),
      endsAt: new Date(now.getTime() - 60_000),
    });
    const { event: otherEvent } = await createEventFixture(prisma, {
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
    const guild = await createGuildFixture(prisma);
    await createMemberFixture(prisma, { guildId: guild.id });
    const { event } = await createEventFixture(prisma, { guildId: guild.id });

    await withAuth(
      request(app.getHttpServer()).put(
        `/guilds/${guild.id}/events/${event.id}/pin`,
      ),
    ).expect(403);
  });
});
