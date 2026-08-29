import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { EventPointsService } from "./event-points.service.js";
import { EventReadCacheService } from "./event-read-cache.service.js";
import { PrismaService } from "#src/db/prisma.service";
import { EventEmitterService } from "./event-emitter.service.js";

describe("EventPointsService", () => {
  let service: EventPointsService;

  const mockPrismaService = {
    event: {
      findFirst: mockFn(),
      findUnique: mockFn(),
    },
    eventRanking: {
      findMany: mockFn(),
      findFirst: mockFn(),
      findUnique: mockFn(),
      create: mockFn(),
      createMany: mockFn(),
      update: mockFn(),
      delete: mockFn(),
      deleteMany: mockFn(),
    },
    eventKillPoint: {
      findMany: mockFn(),
      findFirst: mockFn(),
      update: mockFn(),
      updateMany: mockFn(),
    },
    eventMap: {
      findMany: mockFn(),
    },
    eventMapAssignmentHistory: {
      findMany: mockFn(),
    },
    eventRespawnWindowSummary: {
      findMany: mockFn(),
    },
    eventPresenceLog: {
      findMany: mockFn(),
    },
    eventPointsEditHistory: {
      findMany: mockFn(),
      create: mockFn(),
    },
    member: {
      findMany: mockFn(),
    },
    $transaction: mockFn(),
  };

  const mockEventEmitter = {
    emitRankingUpdate: mockFn(),
  };

  const mockEventReadCache = {
    getEventKey: mockFn(
      (guildId: string, eventId: string, scope: string) =>
        `event-read:${guildId}:${eventId}:${scope}`,
    ),
    getOrSet: mockFn((_key: string, factory: () => Promise<unknown>) =>
      factory(),
    ),
    invalidateEvent: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue([]);
    mockPrismaService.member.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPointsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventReadCacheService, useValue: mockEventReadCache },
        { provide: EventEmitterService, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<EventPointsService>(EventPointsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("includes the highest role color in event ranking members", async () => {
    mockPrismaService.event.findFirst.mockResolvedValue({ id: "event-1" });
    mockPrismaService.eventRanking.findMany.mockResolvedValue([]);

    await service.getRanking("guild-1", "event-1");

    expect(mockPrismaService.eventRanking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          member: {
            select: {
              id: true,
              name: true,
              roles: {
                select: {
                  position: true,
                  color: true,
                },
                orderBy: {
                  position: "desc",
                },
                take: 1,
              },
            },
          },
        }),
      }),
    );
  });

  describe("calculateMemberPoints", () => {
    const getDefaultParams = () => ({
      scoringMode: "ADVANCED" as const,
      eligible: true,
      trackingDurationPercentage: 50,
      trackingDurationSeconds: 3600,
      assignedMembersCount: 8,
      killTime: new Date("2026-01-15T05:00:00.000Z"),
      respawnStartTime: new Date("2026-01-15T03:00:00.000Z"),
      memberLeaveTime: null,
      memberPresentAtKill: true,
      timeOnMapSeconds: 900,
      afkPercentage: 0,
      wasPresent: true,
    });

    it("supports SIMPLE mode with 1 point for eligible member", () => {
      const eligible = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringMode: "SIMPLE",
      });
      expect(eligible.totalPoints).toBe(1);
      expect(eligible.basePoints).toBe(1);

      const notEligible = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringMode: "SIMPLE",
        eligible: false,
      });
      expect(notEligible.totalPoints).toBe(0);
    });

    it("applies advanced thresholds and leave-grace rule", () => {
      const full = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 80,
        assignedMembersCount: 10,
        memberPresentAtKill: true,
      });
      expect(full.basePoints).toBe(1);

      const afterGrace = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 80,
        assignedMembersCount: 10,
        memberPresentAtKill: false,
        memberLeaveTime: new Date("2026-01-15T04:49:00.000Z"),
      });
      expect(afterGrace.basePoints).toBe(0);
    });

    it("adds bonuses and applies hard cap", () => {
      const result = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 90,
        assignedMembersCount: 2,
        killTime: new Date("2026-01-15T07:30:00.000Z"),
        respawnStartTime: new Date("2026-01-15T02:00:00.000Z"),
      });

      expect(result.basePoints).toBe(1);
      expect(result.bonusPoints).toBe(1.5);
      expect(result.totalPoints).toBe(2);
      expect(result.appliedBonuses).toHaveLength(3);
      expect(result.appliedBonuses.map((bonus) => bonus.ruleId)).toEqual(
        expect.arrayContaining([
          "bonus-small-group",
          "bonus-night",
          "bonus-pvp",
        ]),
      );
    });

    it("blocks all bonus actions when tracking is below configured threshold", () => {
      const result = service.calculateMemberPoints({
        ...getDefaultParams(),
        trackingDurationPercentage: 49,
        assignedMembersCount: 2,
        killTime: new Date("2026-01-15T07:30:00.000Z"),
        respawnStartTime: new Date("2026-01-15T02:00:00.000Z"),
      });

      expect(result.basePoints).toBe(0.25);
      expect(result.bonusPoints).toBe(0);
      expect(result.totalPoints).toBe(0.25);
      expect(result.appliedBonuses).toHaveLength(0);
    });

    it("allows bonuses below 50% when minTrackingPercentForBonuses is lowered", () => {
      const result = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringRules: {
          version: 1,
          timezone: "Europe/Warsaw",
          hardCapPoints: 2,
          minTrackingPercentForBonuses: 30,
          rules: [
            {
              id: "base-25",
              enabled: true,
              conditions: [
                {
                  type: "NUMERIC",
                  factor: "trackingDurationPercentage",
                  operator: ">=",
                  value: 25,
                },
              ],
              action: { type: "SET_BASE", points: 0.25 },
            },
            {
              id: "bonus-group",
              enabled: true,
              conditions: [
                {
                  type: "NUMERIC",
                  factor: "assignedMembersCount",
                  operator: "<=",
                  value: 4,
                },
              ],
              action: { type: "ADD_BONUS", points: 0.5 },
            },
            {
              id: "bonus-night",
              enabled: true,
              conditions: [
                {
                  type: "RESPAWN_WINDOW_COVERAGE",
                  from: "03:00",
                  to: "08:00",
                  operator: ">=",
                  value: 75,
                },
              ],
              action: { type: "ADD_BONUS", points: 0.5 },
            },
            {
              id: "bonus-pvp",
              enabled: true,
              conditions: [
                {
                  type: "KILL_TIME_IN_WINDOW",
                  from: "08:00",
                  to: "11:00",
                },
              ],
              action: { type: "ADD_BONUS", points: 0.5 },
            },
          ],
        },
        trackingDurationPercentage: 40,
        assignedMembersCount: 2,
        killTime: new Date("2026-01-15T07:30:00.000Z"),
        respawnStartTime: new Date("2026-01-15T02:00:00.000Z"),
      });

      expect(result.basePoints).toBe(0.25);
      expect(result.bonusPoints).toBe(1.5);
      expect(result.totalPoints).toBe(1.75);
      expect(result.appliedBonuses).toHaveLength(3);
    });

    it("supports respawnProgressPercentage numeric conditions", () => {
      const scoringRules = {
        version: 1 as const,
        timezone: "Europe/Warsaw",
        hardCapPoints: 10,
        minTrackingPercentForBonuses: 0,
        rules: [
          {
            id: "base",
            enabled: true,
            conditions: [
              {
                type: "NUMERIC" as const,
                factor: "trackingDurationPercentage" as const,
                operator: ">=" as const,
                value: 0,
              },
            ],
            action: { type: "SET_BASE" as const, points: 1 },
          },
          {
            id: "bonus-progress",
            enabled: true,
            conditions: [
              {
                type: "NUMERIC" as const,
                factor: "respawnProgressPercentage" as const,
                operator: ">=" as const,
                value: 75,
              },
            ],
            action: {
              type: "ADD_BONUS" as const,
              points: 1,
            },
          },
        ],
      };

      const withMaxRespawn = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringRules,
        trackingDurationPercentage: 100,
        killTime: new Date("2026-01-15T03:30:00.000Z"),
        respawnStartTime: new Date("2026-01-15T02:00:00.000Z"),
        maxRespawnTime: new Date("2026-01-15T04:00:00.000Z"),
      });

      expect(withMaxRespawn.bonusPoints).toBe(1);
      expect(withMaxRespawn.totalPoints).toBe(2);
      expect(withMaxRespawn.appliedBonuses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: "bonus-progress",
            points: 1,
          }),
        ]),
      );

      const withoutMaxRespawn = service.calculateMemberPoints({
        ...getDefaultParams(),
        scoringRules,
        trackingDurationPercentage: 100,
        killTime: new Date("2026-01-15T03:30:00.000Z"),
        respawnStartTime: new Date("2026-01-15T02:00:00.000Z"),
        maxRespawnTime: null,
      });

      expect(withoutMaxRespawn.bonusPoints).toBe(0);
      expect(withoutMaxRespawn.totalPoints).toBe(1);
      expect(withoutMaxRespawn.appliedBonuses).toHaveLength(0);
    });
  });

  describe("recalculateEventPoints", () => {
    it("uses summary windowOpenedAt when rebuilding assignment overlap for recalculation", async () => {
      const eventId = "event-1";
      const killId = "kill-1";
      const killTime = new Date("2026-01-15T05:00:00.000Z");
      const minSpawn = new Date("2026-01-15T03:00:00.000Z");
      const windowOpenedAt = new Date("2026-01-15T02:00:00.000Z");

      mockPrismaService.eventKillPoint.findMany.mockResolvedValueOnce([
        {
          id: "kp-1",
          killId,
          memberId: 123,
          manualAdjustmentPoints: 0,
          trackingDurationSeconds: 4032,
          timeOnMapSeconds: 900,
          afkPercentage: 0,
          wasPresent: true,
          kill: {
            id: killId,
            killedAt: killTime,
            minSpawnTimeAtKill: minSpawn,
            maxSpawnTimeAtKill: new Date("2026-01-15T06:00:00.000Z"),
            heroNpc: {
              id: "hero-1",
              maps: [{ id: "map-1" }],
            },
          },
        },
      ]);
      mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue([
        {
          killId,
          windowOpenedAt,
        },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue(
        [],
      );
      mockPrismaService.eventRanking.findMany.mockResolvedValue([]);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({});
      mockPrismaService.eventRanking.create.mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation((operations) =>
        Promise.all(operations),
      );
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        guildId: "guild-1",
        scoringMode: "ADVANCED",
        scoringRules: null,
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(
        mockPrismaService.eventMapAssignmentHistory.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { unassignedAt: null },
              { unassignedAt: { gte: windowOpenedAt } },
            ],
          }),
        }),
      );
    });

    it("recalculates kill points with bonus breakdown and updates ranking", async () => {
      const eventId = "event-1";
      const killId = "kill-1";
      const killTime = new Date("2026-01-15T05:00:00.000Z");
      const minSpawn = new Date("2026-01-15T03:00:00.000Z");

      mockPrismaService.eventKillPoint.findMany.mockResolvedValueOnce([
        {
          id: "kp-1",
          killId,
          memberId: 123,
          manualAdjustmentPoints: 0,
          trackingDurationSeconds: 4032,
          timeOnMapSeconds: 900,
          afkPercentage: 0,
          kill: {
            id: killId,
            killedAt: killTime,
            minSpawnTimeAtKill: minSpawn,
            heroNpc: {
              id: "hero-1",
              npcName: "Test Hero",
              maps: [{ id: "map-1" }],
            },
          },
        },
      ]);

      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: "map-1",
          memberId: 123,
          assignedAt: new Date("2026-01-15T03:52:48.000Z"),
          unassignedAt: null,
        },
      ]);

      mockPrismaService.eventRanking.findMany.mockResolvedValue([]);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({});
      mockPrismaService.eventRanking.create.mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation((operations) =>
        Promise.all(operations),
      );

      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        guildId: "guild-1",
        scoringMode: "ADVANCED",
        scoringRules: null,
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "kp-1" },
          data: expect.objectContaining({
            basePoints: 0.5,
            points: 1.5,
            trackingDurationSeconds: 4032,
            trackingDurationPercentage: 56,
            bonusBreakdown: expect.arrayContaining([
              expect.objectContaining({
                ruleId: "bonus-small-group",
                points: 0.5,
              }),
              expect.objectContaining({
                ruleId: "bonus-night",
                points: 0.5,
              }),
            ]),
          }),
        }),
      );

      expect(mockPrismaService.eventRanking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId,
            memberId: 123,
            heroNpcName: "Test Hero",
            totalPoints: 1.5,
            totalKills: 1,
            totalTimeSeconds: 4032,
          }),
        }),
      );

      expect(mockPrismaService.eventKillPoint.findMany).toHaveBeenCalledTimes(
        1,
      );
      expect(
        Array.isArray(mockPrismaService.$transaction.mock.calls[0]?.[0]),
      ).toBe(true);
      expect(mockEventEmitter.emitRankingUpdate).toHaveBeenCalledWith(
        "guild-1",
        eventId,
      );
    });

    it("clamps tracking duration to minSpawn->kill window during recalculation", async () => {
      const eventId = "event-1";
      const killId = "kill-2";
      const killTime = new Date("2026-01-15T05:00:00.000Z");
      const minSpawn = new Date("2026-01-15T03:00:00.000Z");

      mockPrismaService.eventKillPoint.findMany.mockResolvedValueOnce([
        {
          id: "kp-2",
          killId,
          memberId: 123,
          manualAdjustmentPoints: 0,
          trackingDurationSeconds: 9000,
          timeOnMapSeconds: 900,
          afkPercentage: 0,
          kill: {
            id: killId,
            killedAt: killTime,
            minSpawnTimeAtKill: minSpawn,
            heroNpc: {
              id: "hero-1",
              npcName: "Test Hero",
              maps: [{ id: "map-1" }],
            },
          },
        },
      ]);

      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: "map-1",
          memberId: 123,
          assignedAt: new Date("2026-01-15T02:00:00.000Z"),
          unassignedAt: null,
        },
      ]);

      mockPrismaService.eventRanking.findMany.mockResolvedValue([]);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({});
      mockPrismaService.eventRanking.create.mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation((operations) =>
        Promise.all(operations),
      );

      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        guildId: "guild-1",
        scoringMode: "ADVANCED",
        scoringRules: null,
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "kp-2" },
          data: expect.objectContaining({
            trackingDurationSeconds: 7200,
            trackingDurationPercentage: 100,
          }),
        }),
      );

      expect(mockPrismaService.eventRanking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalTimeSeconds: 7200,
          }),
        }),
      );
    });

    it("preserves manual kill adjustments and ranking adjustments during recalculation", async () => {
      const eventId = "event-1";
      const killId = "kill-3";

      mockPrismaService.eventKillPoint.findMany.mockResolvedValueOnce([
        {
          id: "kp-3",
          killId,
          memberId: 123,
          basePoints: 1.5,
          points: 1.75,
          manualAdjustmentPoints: 0.25,
          confirmationDeadlineAt: null,
          confirmedAt: null,
          trackingDurationSeconds: 4032,
          timeOnMapSeconds: 900,
          afkPercentage: 0,
          wasPresent: true,
          kill: {
            id: killId,
            killedAt: new Date("2026-01-15T05:00:00.000Z"),
            minSpawnTimeAtKill: new Date("2026-01-15T03:00:00.000Z"),
            maxSpawnTimeAtKill: new Date("2026-01-15T06:00:00.000Z"),
            heroNpc: {
              id: "hero-1",
              npcName: "Test Hero",
              maps: [{ id: "map-1" }],
            },
          },
        },
      ]);
      mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
        {
          mapId: "map-1",
          memberId: 123,
          assignedAt: new Date("2026-01-15T03:52:48.000Z"),
          unassignedAt: null,
        },
      ]);
      mockPrismaService.eventRanking.findMany.mockResolvedValue([
        {
          id: "ranking-1",
          memberId: 123,
          heroNpcName: "Test Hero",
          totalPoints: 2.25,
          manualAdjustmentPoints: 0.5,
          pointsModified: true,
        },
      ]);
      mockPrismaService.eventKillPoint.update.mockResolvedValue({});
      mockPrismaService.eventRanking.update.mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation((operations) =>
        Promise.all(operations),
      );
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        guildId: "guild-1",
        scoringMode: "ADVANCED",
        scoringRules: null,
      });

      await service.recalculateEventPoints(eventId, 1);

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "kp-3" },
          data: expect.objectContaining({
            basePoints: 0.5,
            points: 1.75,
            bonusBreakdown: expect.arrayContaining([
              expect.objectContaining({
                ruleId: "bonus-small-group",
                points: 0.5,
              }),
              expect.objectContaining({
                ruleId: "bonus-night",
                points: 0.5,
              }),
            ]),
          }),
        }),
      );

      expect(mockPrismaService.eventRanking.update).toHaveBeenCalledWith({
        where: { id: "ranking-1" },
        data: expect.objectContaining({
          totalPoints: 2.25,
          manualAdjustmentPoints: 0.5,
          totalKills: 1,
          pointsModified: true,
        }),
      });
    });
  });

  describe("updateKillPoint", () => {
    it("adds a signed delta, preserves auto breakdown, and stores the edit comment", async () => {
      mockPrismaService.eventKillPoint.findFirst.mockResolvedValue({
        id: "kp-1",
        killId: "kill-1",
        memberId: 123,
        points: 1.5,
        manualAdjustmentPoints: 0.5,
        basePoints: 1,
        bonusBreakdown: [{ ruleId: "bonus-night", points: 0.5 }],
        confirmationDeadlineAt: null,
        confirmedAt: null,
        kill: {
          heroNpc: {
            npcName: "Test Hero",
          },
        },
      });
      mockPrismaService.eventKillPoint.update.mockResolvedValue({
        id: "kp-1",
      });
      mockPrismaService.eventRanking.findFirst.mockResolvedValue({
        id: "ranking-1",
        totalPoints: 10,
      });
      mockPrismaService.eventRanking.update.mockResolvedValue({});
      mockPrismaService.eventPointsEditHistory.create.mockResolvedValue({});

      await service.updateKillPoint(
        "guild-1",
        "event-1",
        "kill-1",
        "kp-1",
        2.5,
        "  Ręczna korekta  ",
        "user-1",
      );

      expect(mockPrismaService.eventKillPoint.update).toHaveBeenCalledWith({
        where: { id: "kp-1" },
        data: {
          points: 4,
          manualAdjustmentPoints: 3,
        },
      });

      expect(
        mockPrismaService.eventPointsEditHistory.create,
      ).toHaveBeenCalledWith({
        data: {
          rankingId: "ranking-1",
          previousPoints: 10,
          newPoints: 12.5,
          editType: "KILL_POINT",
          editedByUserId: "user-1",
          comment: "Ręczna korekta",
        },
      });
    });
  });

  describe("updateRankingPoints", () => {
    it("adds ranking delta and optional comment", async () => {
      mockPrismaService.eventRanking.findFirst.mockResolvedValue({
        id: "ranking-1",
        eventId: "event-1",
        memberId: 123,
        heroNpcName: "Test Hero",
        totalPoints: 10,
        manualAdjustmentPoints: 1.5,
      });
      mockPrismaService.eventKillPoint.findMany.mockResolvedValue([]);
      mockPrismaService.eventPointsEditHistory.create.mockResolvedValue({});
      mockPrismaService.eventRanking.update.mockResolvedValue({});

      await service.updateRankingPoints(
        "guild-1",
        "event-1",
        "ranking-1",
        1.5,
        "  Korekta rankingu  ",
        "user-1",
      );

      expect(
        mockPrismaService.eventPointsEditHistory.create,
      ).toHaveBeenCalledWith({
        data: {
          rankingId: "ranking-1",
          previousPoints: 10,
          newPoints: 11.5,
          editType: "RANKING",
          editedByUserId: "user-1",
          comment: "Korekta rankingu",
        },
      });

      expect(mockPrismaService.eventRanking.update).toHaveBeenCalledWith({
        where: { id: "ranking-1" },
        data: {
          totalPoints: 11.5,
          manualAdjustmentPoints: 3,
          pointsModified: true,
        },
      });
    });
  });

  describe("acknowledgeExpiredParticipationConfirmations", () => {
    it("acknowledges only expired unconfirmed kills for the current member and event", async () => {
      mockPrismaService.eventKillPoint.updateMany.mockResolvedValue({
        count: 2,
      });

      await expect(
        service.acknowledgeExpiredParticipationConfirmations(
          "guild-1",
          "event-1",
          123,
          ["kill-1", "kill-2"],
        ),
      ).resolves.toEqual({ acknowledgedCount: 2 });

      expect(mockPrismaService.eventKillPoint.updateMany).toHaveBeenCalledWith({
        where: {
          killId: {
            in: ["kill-1", "kill-2"],
          },
          memberId: 123,
          confirmedAt: null,
          confirmationDeadlineAt: {
            lt: expect.any(Date),
          },
          confirmationExpiredAcknowledgedAt: null,
          kill: {
            heroNpc: {
              eventId: "event-1",
              event: {
                guildId: "guild-1",
              },
            },
          },
        },
        data: {
          confirmationExpiredAcknowledgedAt: expect.any(Date),
        },
      });
    });
  });

  describe("getPendingParticipationConfirmations", () => {
    it("returns only expired confirmations that have not been acknowledged", async () => {
      mockPrismaService.event.findFirst.mockResolvedValue({ id: "event-1" });
      mockPrismaService.eventKillPoint.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getPendingParticipationConfirmations(
        "guild-1",
        "event-1",
        123,
      );

      expect(mockPrismaService.eventKillPoint.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            memberId: 123,
            confirmedAt: null,
            confirmationExpiredAcknowledgedAt: null,
          }),
        }),
      );
    });
  });

  describe("getRankingEditHistories", () => {
    it("returns histories grouped by ranking with editor names", async () => {
      mockPrismaService.eventPointsEditHistory.findMany.mockResolvedValue([
        {
          id: "history-1",
          rankingId: "ranking-1",
          previousPoints: 10,
          newPoints: 11.5,
          editType: "RANKING",
          editedByUserId: "user-1",
          comment: "Komentarz",
          editedAt: new Date("2026-03-12T20:00:00.000Z"),
        },
        {
          id: "history-2",
          rankingId: "ranking-2",
          previousPoints: 20,
          newPoints: 18,
          editType: "KILL_POINT",
          editedByUserId: "user-2",
          comment: null,
          editedAt: new Date("2026-03-11T20:00:00.000Z"),
        },
      ]);
      mockPrismaService.member.findMany.mockResolvedValue([
        {
          globalUserId: "user-1",
          name: "Kamil",
        },
      ]);

      const result = await service.getRankingEditHistories(
        "guild-1",
        "event-1",
        ["ranking-1", "ranking-2"],
      );

      expect(
        mockPrismaService.eventPointsEditHistory.findMany,
      ).toHaveBeenCalledWith({
        where: {
          rankingId: {
            in: ["ranking-1", "ranking-2"],
          },
          ranking: {
            eventId: "event-1",
            event: {
              guildId: "guild-1",
            },
          },
        },
        orderBy: { editedAt: "desc" },
      });
      expect(mockPrismaService.member.findMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-1",
          globalUserId: {
            in: ["user-1", "user-2"],
          },
        },
        select: {
          globalUserId: true,
          name: true,
        },
      });
      expect(result).toEqual(
        new Map([
          [
            "ranking-1",
            [
              expect.objectContaining({
                id: "history-1",
                deltaPoints: 1.5,
                editedByName: "Kamil",
                comment: "Komentarz",
              }),
            ],
          ],
          [
            "ranking-2",
            [
              expect.objectContaining({
                id: "history-2",
                deltaPoints: -2,
                editedByName: null,
                comment: null,
              }),
            ],
          ],
        ]),
      );
    });

    it("skips history and editor queries without ranking ids", async () => {
      await expect(
        service.getRankingEditHistories("guild-1", "event-1", []),
      ).resolves.toEqual(new Map());

      expect(
        mockPrismaService.eventPointsEditHistory.findMany,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.member.findMany).not.toHaveBeenCalled();
    });
  });
});
