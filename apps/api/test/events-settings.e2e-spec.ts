import { type INestApplication } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import request from "supertest";
import { PrismaService } from "../src/db/prisma.service";
import {
  closeE2EApp,
  createE2EApp,
  createGuildFixture,
  resetEventsTimersState,
  TEST_AUTH,
  withAuth,
} from "./events-timers-e2e-helpers";

describe("Events Settings E2E", () => {
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

  it("gets defaults and updates event settings", async () => {
    const guild = await createGuildFixture(prisma);

    await withAuth(
      request(app.getHttpServer()).get(`/guilds/${guild.id}/event-settings`),
    )
      .expect(200)
      .expect((response) => {
        expect(response.body.guildId).toBe(guild.id);
        expect(response.body.userId).toBe(TEST_AUTH.userId);
      });

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/event-settings`)
        .send({ pinnedEvents: ["event-1", "event-2"] }),
    )
      .expect(200)
      .expect((response) => {
        expect(response.body.pinnedEvents).toEqual(["event-1", "event-2"]);
      });

    await withAuth(
      request(app.getHttpServer()).get(`/guilds/${guild.id}/event-settings`),
    )
      .expect(200)
      .expect((response) => {
        expect(response.body.pinnedEvents).toEqual(["event-1", "event-2"]);
      });
  });

  it("rejects invalid event settings body", async () => {
    const guild = await createGuildFixture(prisma);

    await withAuth(
      request(app.getHttpServer())
        .patch(`/guilds/${guild.id}/event-settings`)
        .send({ pinnedEvents: "not-array" }),
    ).expect(400);
  });
});
