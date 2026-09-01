import { db as prismaDb } from "../prisma/db.js";
import { ActivitiesService } from "./activities.service.js";
import type { PrismaService } from "#src/prisma.service";

const ActivitySource = prismaDb.nativeEnums.public.ActivitySource.members;
type ActivitySource = (typeof ActivitySource)[keyof typeof ActivitySource];
const ActivityType = prismaDb.nativeEnums.public.ActivityType.members;
type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

describe("ActivitiesService", () => {
  const execute = vi.fn().mockResolvedValue({ affectedRows: 1 });
  const sessionAggregate = vi.fn().mockResolvedValue({
    activeSessionCount: 1,
  });
  const sessionDelete = vi.fn();
  const statsUpdate = vi.fn();
  const activityCreate = vi.fn().mockResolvedValue({
    id: "activity-1",
    userId: "user-1",
    guildId: "guild-1",
    discordId: "discord-1",
    _type: ActivityType.CONNECT_EVENT,
    source: ActivitySource.WEB_APP,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    idempotencyKey: "connect-1",
    world: null,
    details: null,
    actorSnapshotId: null,
  });
  const statsAggregate = vi.fn();
  const statsWhereResult = {
    where: vi.fn(() => statsWhereResult),
    update: statsUpdate,
    groupBy: vi.fn(() => ({ aggregate: statsAggregate })),
  };
  const transaction = {
    execute,
    orm: {
      public: {
        Activity: { create: activityCreate },
        ActivityActorSnapshot: { first: vi.fn() },
        MemberActivitySession: {
          where: vi.fn(() => ({
            aggregate: sessionAggregate,
            delete: sessionDelete,
          })),
        },
        MemberActivityStats: { where: vi.fn(() => statsWhereResult) },
      },
    },
  };
  const db = {
    raw: prismaDb.raw,
    runtime: vi.fn(() => ({ execute })),
    transaction: vi.fn(async (callback) => callback(transaction)),
    orm: {
      public: {
        Activity: {
          where: vi.fn(() => ({
            first: vi.fn(),
            delete: vi.fn(),
            groupBy: vi.fn(() => ({ aggregate: statsAggregate })),
          })),
        },
        ActivityActorSnapshot: { where: vi.fn() },
      },
    },
  };
  const prisma = { db } as unknown as PrismaService;
  const service = new ActivitiesService(prisma);

  beforeEach(() => vi.clearAllMocks());

  it("creates an activity and updates session statistics atomically", async () => {
    await expect(
      service.create({
        userId: "user-1",
        guildId: "guild-1",
        discordId: "discord-1",
        type: ActivityType.CONNECT_EVENT,
        source: ActivitySource.WEB_APP,
        details: { sessionId: "session-1" },
        idempotencyKey: "connect-1",
      }),
    ).resolves.toMatchObject({
      id: "activity-1",
      type: ActivityType.CONNECT_EVENT,
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(activityCreate).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("clears sessions and active counters in one transaction", async () => {
    await service.clearActiveSessionsForMember({
      guildId: "guild-1",
      discordId: "discord-1",
    });

    expect(sessionDelete).toHaveBeenCalledOnce();
    expect(statsUpdate).toHaveBeenCalledWith({
      activeSessionCount: 0,
      updatedAt: expect.any(Temporal.Instant),
    });
  });

  it("aggregates guild activity stats", async () => {
    statsAggregate.mockResolvedValue([
      { _type: ActivityType.CONNECT_EVENT, count: 3 },
      { _type: ActivityType.DISCONNECT_EVENT, count: 2 },
    ]);

    await expect(service.getStatsByGuild("guild-1")).resolves.toEqual({
      [ActivityType.CONNECT_EVENT]: 3,
      [ActivityType.DISCONNECT_EVENT]: 2,
    });
  });
});
