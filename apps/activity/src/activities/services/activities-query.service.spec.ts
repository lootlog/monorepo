import { db as prismaDb } from "../../prisma/db.js";
import type { Contract } from "../../prisma/contract.js";
import { ActivitiesQueryService } from "./activities-query.service.js";
import type { PrismaService } from "#src/prisma.service";

const ActivitySource = prismaDb.nativeEnums.public.ActivitySource.members;
type ActivitySource =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["ActivitySource"]["values"][number];

function fluentModel(rows: unknown[] = []) {
  const model = {
    where: vi.fn(() => model),
    select: vi.fn(() => model),
    orderBy: vi.fn(() => model),
    limit: vi.fn(() => model),
    groupBy: vi.fn(() => model),
    aggregate: vi.fn().mockResolvedValue(rows),
    all: vi.fn().mockResolvedValue(rows),
    first: vi.fn(),
  };
  return model;
}

describe("ActivitiesQueryService", () => {
  it("normalizes Prisma temporals in member statistics", async () => {
    const stats = fluentModel([
      {
        guildId: "guild-1",
        discordId: "discord-1",
        source: ActivitySource.WEB_APP,
        visitCount: 2,
        activeSessionCount: 1,
        lastSeenAt: { toString: () => "2026-01-01T00:00:00Z" },
        createdAt: { toString: () => "2026-01-01T00:00:00Z" },
        updatedAt: { toString: () => "2026-01-01T00:00:00Z" },
      },
    ]);
    const service = new ActivitiesQueryService({
      db: { orm: { public: { MemberActivityStats: stats } } },
    } as unknown as PrismaService);

    const [result] = await service.findMemberActivityStatsByGuild("guild-1");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.lastSeenAt).toBeInstanceOf(Date);
  });

  it("deduplicates actor-name suggestions", async () => {
    const activities = fluentModel([{ actorSnapshotId: "snapshot-1" }]);
    const snapshots = fluentModel([{ name: " Player " }, { name: "player" }]);
    const service = new ActivitiesQueryService({
      db: {
        orm: {
          public: {
            Activity: activities,
            ActivityActorSnapshot: snapshots,
          },
        },
      },
    } as unknown as PrismaService);

    await expect(
      service.suggestActorNames("guild-1", "pla", 10),
    ).resolves.toEqual(["Player"]);
  });
});
