import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/db/prisma.service.js";
import { temporalToDate } from "../src/db/temporal.js";
import { ReservationMutationsService } from "../src/reservations/reservation-mutations.service.js";
import { closeE2EApp, createE2EApp } from "./events-timers-e2e-helpers.js";
import { insertDatabaseFixture } from "./database-fixtures.js";

describe("Reservations", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createE2EApp());
  });

  beforeEach(async () => {
    await prisma.db
      .runtime()
      .execute(
        prisma.db.raw
          .sql`TRUNCATE TABLE "Guild", "Member", "Reservation" CASCADE`
          .affectedCount()
          .build(),
      );
  });

  afterAll(async () => {
    await closeE2EApp(app, prisma);
  });

  it("creates and updates reservation timestamps through the native ORM", async () => {
    const guild = {
      id: "reservations-guild",
      name: "Reservations guild",
      ownerId: "owner",
    };
    await insertDatabaseFixture(prisma, "Guild", guild);
    await insertDatabaseFixture(prisma, "Member", {
      guildId: guild.id,
      globalUserId: "user-1",
      userId: "discord-1",
      name: "Player",
      active: true,
    });

    const guildsService = {
      getCurrentUserAccessibleGuilds: vi.fn().mockResolvedValue([guild]),
    };
    const catalogService = {
      getSpot: vi.fn().mockResolvedValue({ id: "driady", name: "Driady" }),
    };
    const sharingService = {
      getVisibleGuildIds: vi.fn().mockResolvedValue([guild.id]),
    };
    const reminderService = {
      prepare: vi.fn().mockResolvedValue(null),
      schedule: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const eventsPublisher = {
      created: vi.fn().mockResolvedValue(undefined),
      updated: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ReservationMutationsService(
      prisma,
      guildsService as never,
      catalogService as never,
      sharingService as never,
      reminderService as never,
      eventsPublisher as never,
    );
    const startsAt = new Date(
      Math.ceil((Date.now() + 60 * 60_000) / (15 * 60_000)) * 15 * 60_000,
    );
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);

    const created = await service.create({
      context: {
        guildId: guild.id,
        userId: "user-1",
        discordId: "discord-1",
        actorIsOwner: true,
        permissions: [],
      },
      spotId: "driady",
      data: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
    });

    const updatedStartsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const updatedEndsAt = new Date(endsAt.getTime() + 60 * 60_000);
    const updated = await service.updateOwned({
      userId: "user-1",
      discordId: "discord-1",
      reservationId: created.id,
      data: {
        startsAt: updatedStartsAt.toISOString(),
        endsAt: updatedEndsAt.toISOString(),
      },
    });

    expect(temporalToDate(created.startsAt).getTime()).toBe(startsAt.getTime());
    expect(temporalToDate(updated.startsAt).getTime()).toBe(
      updatedStartsAt.getTime(),
    );
    expect(temporalToDate(updated.endsAt).getTime()).toBe(
      updatedEndsAt.getTime(),
    );
  });
});
