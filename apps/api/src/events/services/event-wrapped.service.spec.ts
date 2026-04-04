import { Test, type TestingModule } from "@nestjs/testing";
import type { Guild } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";
import { LootsService } from "src/loots/loots.service";
import { EventWrappedService } from "./event-wrapped.service";

describe("EventWrappedService", () => {
  let service: EventWrappedService;

  const mockPrismaService = {
    event: {
      findFirst: jest.fn(),
    },
    eventRanking: {
      findMany: jest.fn(),
    },
    eventHeroKill: {
      findMany: jest.fn(),
    },
    eventRespawnWindowSummary: {
      findMany: jest.fn(),
    },
    eventMapAssignmentHistory: {
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockLootsService = {
    fetchLootsByGuildId: jest.fn(),
  };

  const guild = {
    id: "guild-1",
    name: "Guild",
  } as Guild;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventWrappedService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: LootsService,
          useValue: mockLootsService,
        },
      ],
    }).compile();

    service = module.get<EventWrappedService>(EventWrappedService);
  });

  it("returns cached wrapped payload when available", async () => {
    const cachedResponse = {
      generatedAt: "2026-03-12T10:00:00.000Z",
      event: {
        id: "event-1",
        name: "Cached Event",
        world: "fobos",
        startsAt: null,
        endsAt: null,
        heroCount: 0,
        mapCount: 0,
        spawnCount: 0,
      },
      overview: {
        totalKills: 0,
        participantCount: 0,
        totalPoints: 0,
        totalTrackedSeconds: 0,
        totalAfkSeconds: 0,
        coveragePercentage: 0,
        avgMapsPerSpawnWindow: 0,
        busiestHour: null,
        busiestHourKills: 0,
        totalLoots: 0,
        rarityTotals: {
          unique: 0,
          heroic: 0,
          legendary: 0,
        },
      },
      leaders: {
        topHunter: null,
        topScorer: null,
        longestDuty: null,
        topAfk: null,
        mostFlexible: null,
        topEfficiency: null,
      },
      coverage: {
        totalWindowCount: 0,
        totalWindowSeconds: 0,
        totalCoverageSeconds: 0,
        totalUncoveredSeconds: 0,
        totalUnassignedSeconds: 0,
        coveragePercentage: 0,
        avgMapsPerSpawnWindow: 0,
        bestHeroCoverage: null,
        roughestHeroCoverage: null,
      },
      heroes: [],
      loot: {
        totalLoots: 0,
        rarityTotals: {
          unique: 0,
          heroic: 0,
          legendary: 0,
        },
        heroBreakdown: [],
      },
    };
    mockRedisService.get.mockResolvedValue(JSON.stringify(cachedResponse));

    const result = await service.getWrapped(guild, "event-1", [], []);

    expect(result).toEqual(cachedResponse);
    expect(mockPrismaService.event.findFirst).not.toHaveBeenCalled();
  });

  it("builds wrapped payload from rankings, coverage and loots", async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockPrismaService.event.findFirst.mockResolvedValue({
      id: "event-1",
      name: "Gwiazda",
      world: "fobos",
      startsAt: new Date("2026-03-12T08:00:00.000Z"),
      endsAt: new Date("2026-03-12T12:00:00.000Z"),
      createdAt: new Date("2026-03-12T07:50:00.000Z"),
      heroNpcs: [
        {
          id: "hero-1",
          npcId: 101,
          npcName: "Maddok",
          npcIcon: "maddok.png",
          maps: [{ id: "map-1" }, { id: "map-2" }],
        },
      ],
    });
    mockPrismaService.eventRanking.findMany.mockResolvedValue([
      {
        memberId: 1,
        heroNpcName: "Maddok",
        totalPoints: 12,
        totalKills: 3,
        totalTimeSeconds: 3600,
        avgAfkPercentage: 10,
        member: {
          id: 1,
          name: "Ada",
          avatar: null,
        },
      },
      {
        memberId: 2,
        heroNpcName: "Maddok",
        totalPoints: 7,
        totalKills: 1,
        totalTimeSeconds: 1800,
        avgAfkPercentage: 0,
        member: {
          id: 2,
          name: "Bartek",
          avatar: null,
        },
      },
    ]);
    mockPrismaService.eventHeroKill.findMany.mockResolvedValue([
      {
        id: "kill-1",
        heroNpcId: "hero-1",
        killedAt: new Date("2026-03-12T09:15:00.000Z"),
        minSpawnTimeAtKill: new Date("2026-03-12T08:30:00.000Z"),
      },
      {
        id: "kill-2",
        heroNpcId: "hero-1",
        killedAt: new Date("2026-03-12T10:45:00.000Z"),
        minSpawnTimeAtKill: new Date("2026-03-12T10:00:00.000Z"),
      },
    ]);
    mockPrismaService.eventRespawnWindowSummary.findMany.mockResolvedValue([
      {
        heroNpcId: "hero-1",
        totalWindowSeconds: 3600,
        totalCoverageSeconds: 5400,
        totalUncoveredSeconds: 600,
        totalUnassignedSeconds: 300,
        mapStats: [{ mapId: "map-1" }, { mapId: "map-2" }],
      },
    ]);
    mockPrismaService.eventMapAssignmentHistory.findMany.mockResolvedValue([
      {
        mapId: "map-1",
        heroNpcId: "hero-1",
        memberId: 1,
        assignedAt: new Date("2026-03-12T08:00:00.000Z"),
        unassignedAt: new Date("2026-03-12T10:00:00.000Z"),
        member: {
          id: 1,
          name: "Ada",
          avatar: null,
        },
      },
      {
        mapId: "map-2",
        heroNpcId: "hero-1",
        memberId: 2,
        assignedAt: new Date("2026-03-12T08:45:00.000Z"),
        unassignedAt: null,
        member: {
          id: 2,
          name: "Bartek",
          avatar: null,
        },
      },
    ]);
    mockLootsService.fetchLootsByGuildId.mockResolvedValue([
      {
        id: 55,
        uniqueId: "loot-55",
        world: "fobos",
        source: "FIGHT",
        location: "Maddok cave",
        createdAt: new Date("2026-03-12T09:20:00.000Z"),
        updatedAt: new Date("2026-03-12T09:20:00.000Z"),
        lootShare: {},
        commentsCount: 0,
        submissions: [],
        players: [],
        npcs: [
          {
            id: 1,
            name: "Maddok",
            icon: null,
            lvl: 300,
            npcId: 101,
            type: "HERO",
          },
        ],
        items: [
          {
            hid: "a",
            name: "Leg",
            icon: "1",
            rarity: "LEGENDARY",
            lvl: 300,
            itemId: 1,
            type: "ARMOR",
            stats: "",
          },
          {
            hid: "b",
            name: "Hero",
            icon: "2",
            rarity: "HEROIC",
            lvl: 280,
            itemId: 2,
            type: "RING",
            stats: "",
          },
          {
            hid: "c",
            name: "Unik",
            icon: "3",
            rarity: "UNIQUE",
            lvl: 260,
            itemId: 3,
            type: "BOOTS",
            stats: "",
          },
        ],
      },
    ]);

    const result = await service.getWrapped(guild, "event-1", [], []);

    expect(result.event.name).toBe("Gwiazda");
    expect(result.overview.totalKills).toBe(2);
    expect(result.overview.participantCount).toBe(2);
    expect(result.overview.rarityTotals.legendary).toBe(1);
    expect(result.leaders.topHunter?.name).toBe("Ada");
    expect(result.leaders.mostFlexible?.name).toBe("Ada");
    expect(result.leaders.mostFlexible?.primaryValue).toBe(1);
    expect(result.leaders.mostFlexible?.secondaryValue).toBe(1);
    expect(result.leaders.topScorer?.primaryValue).toBe(12);
    expect(result.coverage.coveragePercentage).toBe(75);
    expect(result.loot.heroBreakdown[0]?.rarityTotals.heroic).toBe(1);
    expect(result.heroes[0]?.coveragePercentage).toBe(75);
    expect(mockRedisService.set).toHaveBeenCalled();
  });
});
