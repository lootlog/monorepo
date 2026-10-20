import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import {
  FACTION_WARS,
  type FactionWar,
  type FactionWarPointSource,
} from "@lootlog/domain/faction-war";
import {
  factionWarDailyPointsTable,
  factionWarPickTable,
} from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { makeFactionWarPoints } from "./faction-war-points.js";

const war: FactionWar = {
  ...FACTION_WARS[0]!,
  id: "test-war",
  startsAt: "2000-01-01T00:00:00Z",
  endsAt: "2100-01-01T00:00:00Z",
};

const pick = (userId: string) => ({
  warId: war.id,
  userId,
  discordId: `discord-${userId}`,
  faction: "BARBATOS" as const,
  characterId: `character-${userId}`,
  characterName: `Hero ${userId}`,
  world: "tempest",
  pickedAt: new Date("2026-01-01T00:00:00Z"),
});

const withPoints = async (
  run: (context: {
    boundary: Awaited<ReturnType<typeof createDatabaseBoundary>>;
    points: ReturnType<typeof makeFactionWarPoints>;
    pointsOf: (
      userId: string,
      source: FactionWarPointSource,
    ) => Promise<number[]>;
  }) => Promise<void>,
) => {
  const boundary = await createDatabaseBoundary();

  try {
    await boundary.run(
      boundary.database.insert(factionWarPickTable).values(pick("user-1")),
    );

    await run({
      boundary,
      points: makeFactionWarPoints(boundary.database, [war]),
      pointsOf: (userId, source) =>
        boundary.run(
          boundary.database
            .select({ points: factionWarDailyPointsTable.points })
            .from(factionWarDailyPointsTable)
            .where(
              and(
                eq(factionWarDailyPointsTable.userId, userId),
                eq(factionWarDailyPointsTable.source, source),
              ),
            )
            .pipe(Effect.map((rows) => rows.map((row) => row.points))),
        ),
    });
  } finally {
    await boundary.dispose();
  }
};

describe("faction war points", () => {
  it("stops kill points at the daily cap and ignores Users without a faction", async () => {
    await withPoints(async ({ boundary, points, pointsOf }) => {
      const kill = (discordId: string) =>
        boundary.run(
          boundary.database.transaction((transaction) =>
            points.awardKill(transaction, {
              discordId,
              npcType: "TITAN",
              killedAt: new Date("2026-10-21T10:00:00Z"),
            }),
          ),
        );

      for (let titan = 0; titan < 9; titan += 1) await kill("discord-user-1");
      await kill("discord-user-2");

      expect(await pointsOf("user-1", "KILL")).toEqual([
        war.scoring.dailyCaps.KILL,
      ]);
      expect(await pointsOf("user-2", "KILL")).toEqual([]);
    });
  });

  it("counts a retried loot submission once", async () => {
    await withPoints(async ({ boundary, points, pointsOf }) => {
      await boundary.run(
        points.awardLoot("discord-user-1", 42, ["LEGENDARY", "UNIQUE"]),
      );
      await boundary.run(
        points.awardLoot("discord-user-1", 42, ["LEGENDARY", "UNIQUE"]),
      );

      expect(await pointsOf("user-1", "LOOT")).toEqual([52]);
    });
  });

  it("counts overlapping sessions and redelivered checkpoints once", async () => {
    await withPoints(async ({ boundary, points, pointsOf }) => {
      const checkpoint = (
        sessionId: string,
        startedAt: string,
        endedAt: string,
      ) =>
        points.recordOnline({
          version: 1,
          type: "checkpoint",
          userId: "user-1",
          sessionId,
          segmentId: "segment-1",
          startedAt,
          endedAt,
          observedAt: endedAt,
        });

      // Two tabs online 10:00–10:30 and 10:20–10:50 make 50 minutes.
      await boundary.run(
        checkpoint("tab-1", "2026-10-21T08:00:00Z", "2026-10-21T08:30:00Z"),
      );
      await boundary.run(
        checkpoint("tab-2", "2026-10-21T08:20:00Z", "2026-10-21T08:50:00Z"),
      );
      await boundary.run(
        checkpoint("tab-1", "2026-10-21T08:00:00Z", "2026-10-21T08:30:00Z"),
      );

      expect(await pointsOf("user-1", "ONLINE")).toEqual([5]);
    });
  });

  it("counts online time only from the moment of the pick", async () => {
    await withPoints(async ({ boundary, points, pointsOf }) => {
      await boundary.run(
        boundary.database.insert(factionWarPickTable).values({
          ...pick("user-2"),
          pickedAt: new Date("2026-10-21T08:30:00Z"),
        }),
      );

      // Online 08:00–09:00, picked at 08:30: half an hour counts.
      await boundary.run(
        points.recordOnline({
          version: 1,
          type: "checkpoint",
          userId: "user-2",
          sessionId: "tab-1",
          segmentId: "segment-1",
          startedAt: "2026-10-21T08:00:00Z",
          endedAt: "2026-10-21T09:00:00Z",
          observedAt: "2026-10-21T09:00:00Z",
        }),
      );

      expect(await pointsOf("user-2", "ONLINE")).toEqual([3]);
    });
  });
});
