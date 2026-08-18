import { Permission } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { mockFn } from "src/test/mock-fn";
import { TimersService } from "src/timers/timers.service";
import { buildTimerKey } from "src/timers/utils/timer-key";
import { EventModeService } from "./event-mode.service";

describe("EventModeService", () => {
  const now = new Date("2026-07-13T12:00:00.000Z");
  const mockPrisma = {
    userPinnedEvent: {
      findMany: mockFn(),
    },
    event: {
      findMany: mockFn(),
    },
  };
  const mockGuildsService = {
    getUserGuildsWithPermissions: mockFn(),
  };
  const mockTimersService = {
    getTimersForEventHeroLookups: mockFn(),
  };
  let service: EventModeService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    service = new EventModeService(
      mockPrisma as unknown as PrismaService,
      mockGuildsService as unknown as GuildsService,
      mockTimersService as unknown as TimersService,
    );
    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue([
      createGuildContext(),
    ]);
    mockPrisma.userPinnedEvent.findMany.mockResolvedValue([
      {
        eventId: "event-1",
        event: { guildId: "guild-1" },
      },
    ]);
    mockPrisma.event.findMany.mockResolvedValue([createEvent()]);
    mockTimersService.getTimersForEventHeroLookups.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns no events when the user lacks event read permission", async () => {
    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue([
      createGuildContext({ permissions: [Permission.LOOTLOG_ACCESS] }),
    ]);

    const result = await service.getEventMode(createOptions());

    expect(result).toEqual({ generatedAt: now, events: [] });
    expect(mockPrisma.userPinnedEvent.findMany).not.toHaveBeenCalled();
  });

  it("returns no events without pinned events", async () => {
    mockPrisma.userPinnedEvent.findMany.mockResolvedValue([]);

    const result = await service.getEventMode(createOptions());

    expect(result).toEqual({ generatedAt: now, events: [] });
    expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
  });

  it("normalizes the world and projects only the matching active member assignments", async () => {
    mockPrisma.userPinnedEvent.findMany.mockResolvedValue([
      {
        eventId: "event-1",
        event: { guildId: "guild-1" },
      },
    ]);
    mockPrisma.event.findMany.mockResolvedValue([
      createEvent({
        heroNpcs: [
          createHero({
            maps: [
              createMap({ id: "map-b", mapName: "Zachodnia" }),
              createMap({ id: "map-a", mapName: "Północna" }),
            ],
          }),
        ],
      }),
    ]);

    const result = await service.getEventMode(
      createOptions({ world: "  Tempest  " }),
    );

    expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          world: "tempest",
          OR: [{ guildId: "guild-1", id: { in: ["event-1"] } }],
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        }),
        select: expect.objectContaining({
          heroNpcs: {
            select: expect.objectContaining({
              maps: {
                select: expect.objectContaining({
                  assignedMembers: {
                    where: {
                      userId: "discord-1",
                      globalUserId: "user-1",
                      active: true,
                    },
                    select: { id: true },
                  },
                }),
              },
            }),
          },
        }),
      }),
    );
    expect(
      result.events[0]?.assignments.map((assignment) => assignment.mapName),
    ).toEqual(["Północna", "Zachodnia"]);
  });

  it("filters heroes by role level before resolving assignments and timers", async () => {
    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue([
      createGuildContext({ lvlRangeFrom: 1, lvlRangeTo: 100 }),
    ]);
    mockPrisma.event.findMany.mockResolvedValue([
      createEvent({
        heroNpcs: [
          createHero({
            id: "visible-hero",
            npcId: 101,
            npcName: "Widoczny",
            npcLvl: 80,
            maps: [],
          }),
          createHero({
            id: "hidden-hero",
            npcId: 202,
            npcName: "Ukryty",
            npcLvl: 300,
          }),
        ],
      }),
    ]);
    mockTimersService.getTimersForEventHeroLookups.mockResolvedValue([
      createTimer({ npcId: 101, npcName: "Widoczny" }),
    ]);

    const result = await service.getEventMode(createOptions());

    expect(mockTimersService.getTimersForEventHeroLookups).toHaveBeenCalledWith(
      [
        {
          guildId: "guild-1",
          world: "tempest",
          npcId: 101,
          npcName: "Widoczny",
        },
      ],
    );
    expect(result.events[0]).toMatchObject({
      assignments: [],
      nextRespawn: {
        heroId: "visible-hero",
        npcName: "Widoczny",
        status: "OPEN",
      },
    });
  });

  it("prefers assigned heroes and resolves equal respawn times by NPC name", async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      createEvent({
        heroNpcs: [
          createHero({
            id: "hero-b",
            npcId: 202,
            npcName: "Beta",
            maps: [createMap({ id: "map-b" })],
          }),
          createHero({
            id: "hero-a",
            npcId: null,
            npcName: "Alfa",
            maps: [createMap({ id: "map-a" })],
          }),
          createHero({
            id: "unassigned-hero",
            npcId: 303,
            npcName: "Aardvark",
            maps: [createMap({ assigned: false })],
          }),
        ],
      }),
    ]);
    mockTimersService.getTimersForEventHeroLookups.mockResolvedValue([
      createTimer({ npcId: 202, npcName: "Beta" }),
      createTimer({ npcId: 999, npcName: "Alfa", timerKey: "name:alfa" }),
      createTimer({ npcId: 303, npcName: "Aardvark" }),
    ]);

    const result = await service.getEventMode(createOptions());

    expect(result.events[0]?.nextRespawn).toMatchObject({
      heroId: "hero-a",
      npcId: null,
      npcName: "Alfa",
    });
  });

  it("selects the earliest name-only timer regardless of query order", async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      createEvent({
        heroNpcs: [
          createHero({
            id: "name-only-hero",
            npcId: null,
            npcName: "Alfa",
            maps: [],
          }),
        ],
      }),
    ]);
    mockTimersService.getTimersForEventHeroLookups.mockResolvedValue([
      createTimer({
        npcId: 202,
        npcName: "Alfa",
        timerKey: "name:alfa:later",
        minSpawnTime: new Date("2026-07-13T12:15:00.000Z"),
        maxSpawnTime: new Date("2026-07-13T12:45:00.000Z"),
      }),
      createTimer({
        npcId: 101,
        npcName: "Alfa",
        timerKey: "name:alfa:earlier",
        minSpawnTime: new Date("2026-07-13T12:05:00.000Z"),
        maxSpawnTime: new Date("2026-07-13T12:30:00.000Z"),
      }),
    ]);

    const result = await service.getEventMode(createOptions());

    expect(result.events[0]?.nextRespawn).toMatchObject({
      heroId: "name-only-hero",
      npcId: null,
      minSpawnTime: new Date("2026-07-13T12:05:00.000Z"),
      maxSpawnTime: new Date("2026-07-13T12:30:00.000Z"),
    });
  });

  it("preserves administrative access", async () => {
    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue([
      createGuildContext({ permissions: [Permission.ADMIN] }),
    ]);
    mockPrisma.userPinnedEvent.findMany.mockResolvedValue([]);
    await service.getEventMode(createOptions());

    expect(mockGuildsService.getUserGuildsWithPermissions).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
    expect(mockPrisma.userPinnedEvent.findMany).toHaveBeenCalled();
  });
});

function createOptions(
  overrides: Partial<Parameters<EventModeService["getEventMode"]>[0]> = {},
) {
  return {
    userId: "user-1",
    discordId: "discord-1",
    world: "tempest",
    ...overrides,
  };
}

function createGuildContext({
  permissions = [Permission.LOOTLOG_ACCESS, Permission.LOOTLOG_EVENTS_READ],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
}: {
  permissions?: Permission[];
  lvlRangeFrom?: number;
  lvlRangeTo?: number;
} = {}) {
  return {
    guild: {
      id: "guild-1",
      ownerId: "owner-1",
    },
    roles: [
      {
        id: "role-1",
        lvlRangeFrom,
        lvlRangeTo,
        permissions,
      },
    ],
  };
}

function createEvent({
  id = "event-1",
  name = "Polowanie",
  guildId = "guild-1",
  guildName = "Gildia",
  heroNpcs = [createHero()],
}: {
  id?: string;
  name?: string;
  guildId?: string;
  guildName?: string;
  heroNpcs?: ReturnType<typeof createHero>[];
} = {}) {
  return {
    id,
    guildId,
    name,
    world: "tempest",
    guild: {
      id: guildId,
      name: guildName,
    },
    heroNpcs,
  };
}

function createHero({
  id = "hero-1",
  npcId = 101,
  npcName = "Heros",
  npcLvl = 80,
  maps = [createMap()],
}: {
  id?: string;
  npcId?: number | null;
  npcName?: string;
  npcLvl?: number | null;
  maps?: ReturnType<typeof createMap>[];
} = {}) {
  return {
    id,
    npcId,
    npcName,
    npcIcon: "icon.png",
    npcLvl,
    maps,
  };
}

function createMap({
  id = "map-1",
  mapId = 123,
  mapName = "Mapa",
  assigned = true,
}: {
  id?: string;
  mapId?: number;
  mapName?: string;
  assigned?: boolean;
} = {}) {
  return {
    id,
    mapId,
    mapName,
    assignedMembers: assigned ? [{ id: 1 }] : [],
  };
}

function createTimer({
  npcId,
  npcName,
  timerKey = buildTimerKey(npcId, npcName),
  minSpawnTime = new Date("2026-07-13T11:30:00.000Z"),
  maxSpawnTime = new Date("2026-07-13T12:30:00.000Z"),
}: {
  npcId: number;
  npcName: string;
  timerKey?: string;
  minSpawnTime?: Date;
  maxSpawnTime?: Date;
}) {
  return {
    guildId: "guild-1",
    npcId,
    timerKey,
    world: "tempest",
    minSpawnTime,
    maxSpawnTime,
    npc: { name: npcName },
  };
}
