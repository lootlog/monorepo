import { db as prismaDb } from "#src/prisma/db";
import { UnprocessableEntityException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationReminderService } from "./reservation-reminder.service.js";
import { attachPrismaOrmMock } from "#src/test/prisma-orm.mock";

const NotificationTargetType =
  prismaDb.nativeEnums.public.NotificationTargetType.members;
type NotificationTargetType =
  (typeof NotificationTargetType)[keyof typeof NotificationTargetType];

describe("ReservationReminderService", () => {
  const target = {
    id: 7,
    externalId: "dm",
    targetType: NotificationTargetType.DM,
    active: true,
    canSend: true,
  };
  const prisma = {
    notificationTarget: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    notificationRule: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  const jobs = {
    createNotificationJob: vi.fn(),
    enqueueNotificationJob: vi.fn(),
    cancelPendingJobs: vi.fn(),
  };
  let service: ReservationReminderService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.notificationTarget.findFirst.mockResolvedValue(target);
    service = new ReservationReminderService(
      attachPrismaOrmMock(prisma) as never,
      jobs as never,
    );
  });

  it("does not resolve a DM target when no reminder was requested", async () => {
    await expect(
      service.prepare({
        discordId: "discord",
        startsAt: new Date(Date.now() + 60_000),
        reminderMinutesBefore: null,
      }),
    ).resolves.toBeNull();
    expect(prisma.notificationTarget.findFirst).not.toHaveBeenCalled();
  });

  it.each([0, 5, 15, 30])(
    "schedules the %i minute offset against an active DM target",
    async (offset) => {
      const startsAt = new Date(Date.now() + 60 * 60_000);
      const context = await service.prepare({
        discordId: "discord",
        startsAt,
        reminderMinutesBefore: offset,
      });
      expect(context?.scheduledFor.getTime()).toBe(
        startsAt.getTime() - offset * 60_000,
      );
      expect(context?.target).toEqual(target);
    },
  );

  it("rejects reminders without an active DM target", async () => {
    prisma.notificationTarget.findFirst.mockResolvedValue(null);
    await expect(
      service.prepare({
        discordId: "discord",
        startsAt: new Date(Date.now() + 60 * 60_000),
        reminderMinutesBefore: 5,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects a reminder whose delivery time has elapsed", async () => {
    await expect(
      service.prepare({
        discordId: "discord",
        startsAt: new Date(Date.now() + 4 * 60_000),
        reminderMinutesBefore: 5,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.notificationTarget.findFirst).not.toHaveBeenCalled();
  });

  it("does not enqueue a duplicate job rejected by the idempotency key", async () => {
    prisma.notificationRule.findFirst.mockResolvedValue({
      id: 3,
      ownerType: "USER",
      ownerId: "discord",
      guildId: null,
      triggerType: "SCHEDULED_MESSAGE",
    });
    jobs.createNotificationJob.mockResolvedValue(null);
    const startsAt = new Date(Date.now() + 60 * 60_000);
    const context = await service.prepare({
      discordId: "discord",
      startsAt,
      reminderMinutesBefore: 5,
    });

    await service.schedule({
      context,
      discordId: "discord",
      reservationId: 42,
      spotName: "Expowisko",
      organizationName: "Organizacja",
      startsAt,
    });

    expect(jobs.createNotificationJob).toHaveBeenCalledOnce();
    expect(jobs.enqueueNotificationJob).not.toHaveBeenCalled();
  });

  it("formats the reservation start as a Discord relative timestamp", async () => {
    prisma.notificationRule.findFirst.mockResolvedValue({
      id: 3,
      ownerType: "USER",
      ownerId: "discord",
      guildId: null,
      triggerType: "SCHEDULED_MESSAGE",
    });
    jobs.createNotificationJob.mockResolvedValue(null);
    const startsAt = new Date("2030-01-02T03:45:00.000Z");
    const context = await service.prepare({
      discordId: "discord",
      startsAt,
      reminderMinutesBefore: 5,
    });

    await service.schedule({
      context,
      discordId: "discord",
      reservationId: 42,
      spotName: "Driady",
      organizationName: "ZGARBIENI",
      startsAt,
    });

    const discordTimestamp = `<t:${Math.floor(startsAt.getTime() / 1000)}:R>`;
    const expectedMessage = `Rezerwacja Driady w ZGARBIENI rozpoczyna się ${discordTimestamp}.`;
    expect(jobs.createNotificationJob).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadSnapshot: expect.objectContaining({
          message: expectedMessage,
          content: expectedMessage,
          startsAt: startsAt.toISOString(),
        }),
      }),
    );
  });

  it("cancels pending jobs by reservation source identity", async () => {
    await service.cancel(42);
    expect(jobs.cancelPendingJobs).toHaveBeenCalledWith({
      sourceEntityType: "reservation",
      sourceEntityId: "42",
    });
  });
});
