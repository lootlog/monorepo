import { Test, TestingModule } from "@nestjs/testing";
import { ActivitiesService } from "./activities.service.js";
import { PrismaService } from "#src/shared/db/prisma.service";
import { ActivitySource, ActivityType } from "#src/generated/prisma/client";

describe("ActivitiesService", () => {
  let service: ActivitiesService;
  const transactionMock = vi.fn();
  const activityActorSnapshotUpsertMock = vi.fn();
  const prismaServiceMock = {
    $transaction: transactionMock,
    activityActorSnapshot: {
      upsert: activityActorSnapshotUpsertMock,
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    vi.clearAllMocks();
    activityActorSnapshotUpsertMock.mockResolvedValue({ id: "snapshot-1" });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("increments web visits and active sessions on web connect", async () => {
    const tx = createTransactionMock();
    transactionMock.mockImplementation((callback) => callback(tx));

    await service.create({
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.CONNECT_EVENT,
      source: ActivitySource.WEB_APP,
      details: { sessionId: "session-1" },
      idempotencyKey: "connect-1",
    });

    expect(tx.memberActivitySession.createMany).toHaveBeenCalledWith({
      data: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.WEB_APP,
        sessionId: "session-1",
        userId: "user-1",
        userAgent: undefined,
        world: undefined,
        lastSeenAt: expect.any(Date),
      },
      skipDuplicates: true,
    });
    expect(tx.memberActivityStats.upsert).toHaveBeenCalledWith({
      where: {
        guildId_discordId_source: {
          guildId: "guild-1",
          discordId: "discord-1",
          source: ActivitySource.WEB_APP,
        },
      },
      update: {
        lastSeenAt: expect.any(Date),
        visitCount: { increment: 1 },
        activeSessionCount: 1,
      },
      create: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.WEB_APP,
        lastSeenAt: expect.any(Date),
        visitCount: 1,
        activeSessionCount: 1,
      },
    });
  });

  it("does not increment web visits again for duplicate active sessions", async () => {
    const tx = createTransactionMock();
    tx.memberActivitySession.createMany.mockResolvedValue({ count: 0 });
    tx.memberActivitySession.count.mockResolvedValue(1);
    transactionMock.mockImplementation((callback) => callback(tx));

    await service.create({
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.CONNECT_EVENT,
      source: ActivitySource.WEB_APP,
      details: { sessionId: "session-1" },
      idempotencyKey: "connect-duplicate",
    });

    expect(tx.memberActivityStats.upsert).toHaveBeenCalledWith({
      where: {
        guildId_discordId_source: {
          guildId: "guild-1",
          discordId: "discord-1",
          source: ActivitySource.WEB_APP,
        },
      },
      update: {
        lastSeenAt: expect.any(Date),
        activeSessionCount: 1,
      },
      create: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.WEB_APP,
        lastSeenAt: expect.any(Date),
        visitCount: 0,
        activeSessionCount: 1,
      },
    });
  });

  it("decrements web active sessions without going below zero on web disconnect", async () => {
    const tx = createTransactionMock();
    tx.memberActivitySession.count.mockResolvedValue(0);
    transactionMock.mockImplementation((callback) => callback(tx));

    await service.create({
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.DISCONNECT_EVENT,
      source: ActivitySource.WEB_APP,
      details: { sessionId: "session-1" },
      idempotencyKey: "disconnect-1",
    });

    expect(tx.memberActivitySession.deleteMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.WEB_APP,
        sessionId: "session-1",
      },
    });
    expect(tx.memberActivityStats.updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.WEB_APP,
      },
      data: {
        activeSessionCount: 0,
      },
    });
    expect(tx.memberActivityStats.upsert).not.toHaveBeenCalled();
  });

  it("increments game visits and active sessions on game connect", async () => {
    const tx = createTransactionMock();
    transactionMock.mockImplementation((callback) => callback(tx));

    await service.create({
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.CONNECT_EVENT,
      source: ActivitySource.GAME,
      world: "aether",
      details: { sessionId: "session-1" },
      actorSnapshot: {
        accountId: 1,
        characterId: 2,
        name: "Player",
        clanName: "Clan",
        clanId: 3,
        icon: "icon.gif",
        lvl: 50,
        prof: "w",
      },
      idempotencyKey: "game-connect-1",
    });

    expect(tx.memberActivityStats.upsert).toHaveBeenCalledWith({
      where: {
        guildId_discordId_source: {
          guildId: "guild-1",
          discordId: "discord-1",
          source: ActivitySource.GAME,
        },
      },
      update: {
        lastSeenAt: expect.any(Date),
        visitCount: { increment: 1 },
        activeSessionCount: 1,
      },
      create: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.GAME,
        lastSeenAt: expect.any(Date),
        visitCount: 1,
        activeSessionCount: 1,
      },
    });
    expect(tx.memberActivityStats.updateMany).not.toHaveBeenCalled();
  });

  it("decrements game active sessions without going below zero on game disconnect", async () => {
    const tx = createTransactionMock();
    transactionMock.mockImplementation((callback) => callback(tx));

    await service.create({
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.DISCONNECT_EVENT,
      source: ActivitySource.GAME,
      world: "aether",
      details: { sessionId: "session-1" },
      actorSnapshot: {
        accountId: 1,
        characterId: 2,
        name: "Player",
        clanName: "Clan",
        clanId: 3,
        icon: "icon.gif",
        lvl: 50,
        prof: "w",
      },
      idempotencyKey: "game-disconnect-1",
    });

    expect(tx.memberActivityStats.updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.GAME,
      },
      data: {
        activeSessionCount: 1,
      },
    });
    expect(tx.memberActivityStats.upsert).not.toHaveBeenCalled();
  });

  it("clears active sessions for a removed guild member without deleting visit history", async () => {
    const tx = createTransactionMock();
    transactionMock.mockImplementation((callback) => callback(tx));

    await service.clearActiveSessionsForMember({
      guildId: "guild-1",
      discordId: "discord-1",
    });

    expect(tx.memberActivitySession.deleteMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        discordId: "discord-1",
      },
    });
    expect(tx.memberActivityStats.updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        discordId: "discord-1",
        activeSessionCount: { gt: 0 },
      },
      data: {
        activeSessionCount: 0,
      },
    });
    expect(tx.memberActivityStats.upsert).not.toHaveBeenCalled();
  });
});

const createTransactionMock = () => ({
  activity: {
    create: vi.fn().mockResolvedValue({
      id: "activity-1",
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.CONNECT_EVENT,
      source: ActivitySource.WEB_APP,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      details: null,
      actorSnapshot: null,
    }),
  },
  memberActivityStats: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  memberActivitySession: {
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(1),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  activityActorSnapshot: {
    upsert: vi.fn().mockResolvedValue({ id: "snapshot-1" }),
  },
});
