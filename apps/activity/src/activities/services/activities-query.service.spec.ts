import { ActivitiesQueryService } from "./activities-query.service";
import type { PrismaService } from "src/shared/db/prisma.service";

describe("ActivitiesQueryService", () => {
  const activityFindManyMock = vi.fn();
  const activityActorSnapshotFindManyMock = vi.fn();
  const prismaServiceMock = {
    orm: {
      public: {
        Activity: {
          findMany: activityFindManyMock,
        },
        ActivityActorSnapshot: {
          findMany: activityActorSnapshotFindManyMock,
        },
      },
    },
  } as unknown as PrismaService;

  let service: ActivitiesQueryService;

  beforeEach(() => {
    service = new ActivitiesQueryService(prismaServiceMock);
    vi.clearAllMocks();
  });

  it("deduplicates suggested actor names and clamps the lower limit", async () => {
    activityActorSnapshotFindManyMock.mockResolvedValue([
      { name: " Player " },
      { name: "player" },
    ]);

    const names = await service.suggestActorNames("guild-1", "  pla ", 0);

    expect(names).toEqual(["Player"]);
    expect(activityActorSnapshotFindManyMock).toHaveBeenCalledWith({
      where: {
        activities: {
          some: { guildId: "guild-1" },
        },
        name: {
          contains: "pla",
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { name: true },
    });
  });

  it("clamps suggested clan names to the maximum limit", async () => {
    activityActorSnapshotFindManyMock.mockResolvedValue(
      Array.from({ length: 60 }, (_, index) => ({
        clanName: `Clan ${index + 1}`,
      })),
    );

    const names = await service.suggestClanNames("guild-1", undefined, 80);

    expect(names).toHaveLength(50);
    expect(activityActorSnapshotFindManyMock).toHaveBeenCalledWith({
      where: {
        activities: {
          some: { guildId: "guild-1" },
        },
        clanName: {
          not: null,
          notIn: [""],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { clanName: true },
    });
  });

  it("clamps suggested worlds to the lower limit and trims results", async () => {
    activityFindManyMock.mockResolvedValue([{ world: "  Aether  " }]);

    const worlds = await service.suggestWorlds("guild-1", "  ae ", -5);

    expect(worlds).toEqual(["Aether"]);
    expect(activityFindManyMock).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        world: {
          not: null,
          notIn: [""],
          contains: "ae",
          mode: "insensitive",
        },
      },
      distinct: ["world"],
      select: { world: true },
      orderBy: { world: "asc" },
      take: 1,
    });
  });
});
