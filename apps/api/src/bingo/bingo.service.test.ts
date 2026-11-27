import { describe, expect, it } from "bun:test";
import {
  BingoBoardStatus,
  BingoTileConditionKind,
} from "@lootlog/schema/bingo";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { Capability } from "@lootlog/schema/permissions";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { makeBingoEvaluator } from "#src/bingo/bingo-evaluator";
import { makeBingoService } from "#src/bingo/bingo.service";
import {
  bingoBoardTable,
  bingoTileProgressTable,
} from "#src/database/drizzle/bingo.schema";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";

const NOOP_PUBLISHER = {
  publishRealtimeUpdate: () => Effect.void,
  signalMilestones: Effect.void,
};

const VIEWER = {
  discordId: "discord-user-1",
  permissions: [Capability.ADMIN],
};

describe("bingo world normalization", () => {
  it("normalizes mixed-case board worlds on create and update and matches signals case-insensitively", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const now = new Date("2026-11-27T12:00:00.000Z");

      await boundary.run(
        database.insert(guildTable).values({
          id: "guild-1",
          name: "ATC",
          ownerId: VIEWER.discordId,
          updatedAt: now,
        }),
      );

      const [member] = await boundary.run(
        database
          .insert(memberTable)
          .values({
            userId: VIEWER.discordId,
            guildId: "guild-1",
            name: "Player",
            lastDiscordSyncAt: now,
            updatedAt: now,
          })
          .returning({ id: memberTable.id }),
      );

      if (!member) throw new Error("Member was not created");

      const service = makeBingoService(database, NOOP_PUBLISHER);
      const evaluator = makeBingoEvaluator(database, NOOP_PUBLISHER);

      const created = await boundary.run(
        service.createBoard("guild-1", VIEWER, {
          name: "ATC",
          world: "  Arkantes ",
          size: 3,
          populateStarterTiles: false,
          tiles: [
            {
              row: 0,
              col: 0,
              title: "Kill",
              condition: {
                kind: BingoTileConditionKind.KILL,
                targetCount: 5,
                npcTypes: [],
              },
            },
          ],
        }),
      );

      expect(created.board.world).toBe("arkantes");

      const tileId = created.tiles[0]?.id;

      if (!tileId) throw new Error("Tile was not created");

      await boundary.run(
        service.updateBoard("guild-1", created.board.id, VIEWER, {
          status: BingoBoardStatus.ACTIVE,
        }),
      );

      const evaluateKill = (world: string, offsetMs: number) =>
        boundary.run(
          evaluator.evaluateKill({
            guildId: "guild-1",
            memberId: member.id,
            world,
            npcId: 100,
            npcName: "Goblin",
            npcType: NpcTypeEnum.ELITE,
            npcLvl: 50,
            killedAt: new Date(now.getTime() + offsetMs),
          }),
        );

      const readCount = async () => {
        const [row] = await boundary.run(
          database
            .select({ currentCount: bingoTileProgressTable.currentCount })
            .from(bingoTileProgressTable)
            .where(eq(bingoTileProgressTable.tileId, tileId)),
        );

        return row?.currentCount ?? 0;
      };

      await evaluateKill("arkantes", 1_000);
      await evaluateKill("ARKANTES", 2_000);
      await evaluateKill("luvia", 3_000);
      expect(await readCount()).toBe(2);

      const updated = await boundary.run(
        service.updateBoard("guild-1", created.board.id, VIEWER, {
          world: "  GORDION ",
        }),
      );

      expect(updated.world).toBe("gordion");

      await evaluateKill("arkantes", 4_000);
      await evaluateKill("gordion", 5_000);
      expect(await readCount()).toBe(3);

      const cleared = await boundary.run(
        service.updateBoard("guild-1", created.board.id, VIEWER, {
          world: "   ",
        }),
      );

      expect(cleared.world).toBeNull();

      await evaluateKill("luvia", 6_000);
      expect(await readCount()).toBe(4);
    } finally {
      await boundary.dispose();
    }
  });

  it("normalizes existing BingoBoard world values in the backfill migration", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const now = new Date("2026-11-27T12:00:00.000Z");

      await boundary.run(
        database.insert(guildTable).values({
          id: "guild-migration",
          name: "ATC",
          ownerId: VIEWER.discordId,
          updatedAt: now,
        }),
      );

      await boundary.run(
        database.insert(bingoBoardTable).values([
          {
            id: "board-mixed",
            guildId: "guild-migration",
            name: "Mixed",
            world: "  Arkantes ",
            updatedAt: now,
          },
          {
            id: "board-blank",
            guildId: "guild-migration",
            name: "Blank",
            world: "   ",
            updatedAt: now,
          },
          {
            id: "board-null",
            guildId: "guild-migration",
            name: "Null",
            world: null,
            updatedAt: now,
          },
        ]),
      );

      const migrationSql = await Bun.file(
        new URL(
          "../../drizzle/migrations/20261127212531_normalize_bingo_board_world/migration.sql",
          import.meta.url,
        ),
      ).text();

      await boundary.run(database.execute(sql.raw(migrationSql)));

      const rows = await boundary.run(
        database
          .select({ id: bingoBoardTable.id, world: bingoBoardTable.world })
          .from(bingoBoardTable)
          .where(eq(bingoBoardTable.guildId, "guild-migration")),
      );

      expect(new Map(rows.map((row) => [row.id, row.world]))).toEqual(
        new Map<string, string | null>([
          ["board-mixed", "arkantes"],
          ["board-blank", null],
          ["board-null", null],
        ]),
      );
    } finally {
      await boundary.dispose();
    }
  });
});
