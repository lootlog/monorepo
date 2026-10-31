import { describe, expect, it } from "bun:test";
import { Effect, Redacted } from "effect";
import { TestClock } from "effect/testing";
import { FACTION_WARS } from "@lootlog/domain/faction-war";
import {
  factionWarCursorTable,
  factionWarDailyPointsTable,
  factionWarPickTable,
} from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { makeFactionWarPoints } from "./faction-war-points.js";
import { makeFactionWarPvpSync } from "./faction-war-pvp-sync.js";

const war = FACTION_WARS[0]!;

describe("faction war PvP sync", () => {
  it("awards new wins from the cursor on and pays nothing twice", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const requested: Array<string | null> = [];

      const wins = [
        { battleId: "battle-1", userId: "user-1", wonAt: war.startsAt },
        { battleId: "battle-2", userId: "user-1", wonAt: war.startsAt },
      ];

      const sync = makeFactionWarPvpSync({
        database: boundary.database,
        httpClient: httpClientFromResponses((request) => {
          const after = new URL(request.url).searchParams.get("afterBattleId");

          requested.push(after);

          // The battlelog answers in battle ID order after the cursor.
          const page = after
            ? wins.filter((win) => win.battleId > after)
            : wins;

          return Effect.succeed(Response.json({ wins: page }));
        }),
        battlelogServiceUrl: new URL("http://battlelog.test"),
        serviceSecret: Redacted.make("secret"),
        points: makeFactionWarPoints(boundary.database),
      });

      await boundary.run(
        Effect.gen(function* () {
          yield* boundary.database.insert(factionWarPickTable).values({
            warId: war.id,
            userId: "user-1",
            discordId: "discord-1",
            faction: "BARBATOS",
            characterId: "character-1",
            characterName: "Hero",
            world: "tempest",
            pickedAt: new Date(war.startsAt),
          });
          yield* TestClock.setTime(Date.parse(war.startsAt) + 3_600_000);
          yield* sync;
          yield* sync;
        }).pipe(Effect.provide(TestClock.layer())),
      );

      const [cursor] = await boundary.run(
        boundary.database
          .select({ pvpBattleId: factionWarCursorTable.pvpBattleId })
          .from(factionWarCursorTable),
      );

      const points = await boundary.run(
        boundary.database
          .select({ points: factionWarDailyPointsTable.points })
          .from(factionWarDailyPointsTable),
      );

      expect(requested).toEqual([null, "battle-2"]);
      expect(cursor?.pvpBattleId).toBe("battle-2");
      expect(points).toEqual([{ points: 2 * war.scoring.pvpWinPoints }]);
    } finally {
      await boundary.dispose();
    }
  });
});
