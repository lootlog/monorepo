import { expect, it } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import { guildTable } from "#src/database/drizzle/organization.schema";
import {
  eventTable,
  eventHeroNpcTable,
} from "#src/database/drizzle/event.schema";
import {
  timerTable,
  timerHistoryEntryTable,
} from "#src/database/drizzle/timer.schema";
import { makeTimerHistory } from "./timer-history.data-layer.js";
import { createResetRollbackFixture } from "./timer-mutation.fixtures.js";

it.each([
  { action: "RESET", match: "id", removeRow: false },
  { action: "RESET", match: "name", removeRow: false },
  { action: "DELETE", match: "id", removeRow: false },
  { action: "DELETE", match: "name", removeRow: true },
] as const)(
  "protects $action recovery when an event activates (match: $match, missing row: $removeRow)",
  async ({ action, match, removeRow }) => {
    const {
      boundary,
      database,
      original,
      access,
      restore,
      remove,
      readHistory,
      publications,
    } = await createResetRollbackFixture();

    try {
      if (action === "DELETE") {
        await boundary.run(remove(access, original.timerKey, original.world));
        publications.length = 0;
      }

      if (removeRow) {
        await boundary.run(
          database
            .delete(timerTable)
            .where(eq(timerTable.timerKey, original.timerKey)),
        );
      }

      const [entry] = await readHistory();

      if (!entry) throw new Error("Recovery history fixture missing");
      const now = Date.now();
      const otherGuild = createGuildFixture({ id: "event-other-guild" });
      await boundary.run(database.insert(guildTable).values(otherGuild));
      await boundary.run(
        database.insert(eventTable).values([
          {
            id: "scheduled",
            guildId: access.guild.id,
            world: original.world,
            name: "Scheduled event",
            startsAt: new Date(now + 60_000),
            endsAt: new Date(now + 120_000),
            updatedAt: new Date(now),
          },
          {
            id: "other-world",
            guildId: access.guild.id,
            world: "other-world",
            name: "Other world",
            updatedAt: new Date(now),
          },
          {
            id: "other-guild",
            guildId: otherGuild.id,
            world: original.world,
            name: "Other Organization",
            updatedAt: new Date(now),
          },
        ]),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values(
          ["scheduled", "other-world", "other-guild"].map((eventId) => ({
            id: `${eventId}-hero`,
            eventId,
            npcId: match === "id" ? original.npcId : null,
            npcName: match === "name" ? original.npc.name : "Different name",
          })),
        ),
      );
      const history = makeTimerHistory(database);

      const readEligibility = () =>
        boundary.run(
          history.getHistory(access, original.world, original.timerKey, 1),
        );

      expect(await readEligibility()).toMatchObject([
        { id: entry.id, canRestore: true },
      ]);

      await boundary.run(
        database
          .update(eventTable)
          .set({ startsAt: new Date(now - 60_000) })
          .where(eq(eventTable.id, "scheduled")),
      );

      const timersBefore = await boundary.run(
        database.select().from(timerTable),
      );

      const historyBefore = await readHistory();

      const rejected = await boundary.run(
        restore(access, entry.id).pipe(Effect.result),
      );

      expect(rejected).toMatchObject({
        failure: {
          kind: "invalid-request",
          body: { code: "EVENT_TIMER_CANNOT_BE_RESET" },
        },
      });
      expect(await boundary.run(database.select().from(timerTable))).toEqual(
        timersBefore,
      );
      expect(await readHistory()).toEqual(historyBefore);
      expect(publications).toEqual([]);
      expect(await readEligibility()).toMatchObject([
        { id: entry.id, canRestore: false },
      ]);
      expect(
        await boundary.run(history.getRecentHistory(access, original.world, 1)),
      ).toMatchObject([{ id: entry.id, canRestore: false }]);

      await boundary.run(
        database
          .update(eventTable)
          .set({ endsAt: new Date(now - 1) })
          .where(eq(eventTable.id, "scheduled")),
      );
      expect(await readEligibility()).toMatchObject([
        { id: entry.id, canRestore: true },
      ]);
      const recovered = await boundary.run(restore(access, entry.id));
      const expected = action === "RESET" ? original : entry;
      expect(recovered).toMatchObject({
        minSpawnTime: expected.minSpawnTime,
        maxSpawnTime: expected.maxSpawnTime,
        deletedAt: null,
      });
      expect(publications).toHaveLength(2);
    } finally {
      await boundary.dispose();
    }
  },
);

it.each([
  { action: "RESET", guarded: "target" },
  { action: "DELETE", guarded: "target" },
  { action: "DELETE", guarded: "current" },
] as const)(
  "checks event ownership of a different $guarded NPC during $action recovery",
  async ({ action, guarded }) => {
    const {
      boundary,
      database,
      original,
      previousEntry,
      access,
      restore,
      remove,
      readHistory,
      publications,
    } = await createResetRollbackFixture();

    try {
      if (action === "DELETE") {
        await boundary.run(remove(access, original.timerKey, original.world));
        publications.length = 0;
      }

      const [entry] = await readHistory();

      if (!entry) throw new Error("Recovery history fixture missing");

      const changedNpc = {
        npcId: 999,
        npc: { ...original.npc, id: 999, name: "Other hero" },
      };

      if (action === "RESET") {
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set(changedNpc)
            .where(eq(timerHistoryEntryTable.id, previousEntry.id)),
        );
      } else if (guarded === "target") {
        await boundary.run(
          database
            .update(timerTable)
            .set(changedNpc)
            .where(eq(timerTable.timerKey, original.timerKey)),
        );
      } else {
        await boundary.run(
          database
            .update(timerHistoryEntryTable)
            .set(changedNpc)
            .where(eq(timerHistoryEntryTable.id, entry.id)),
        );
      }

      await boundary.run(
        database.insert(eventTable).values({
          id: "active",
          guildId: access.guild.id,
          world: original.world,
          name: "Active event",
          updatedAt: new Date(),
        }),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values({
          id: "active-hero",
          eventId: "active",
          npcId: action === "RESET" ? changedNpc.npcId : original.npcId,
          npcName: "Event hero",
        }),
      );

      const timersBefore = await boundary.run(
        database.select().from(timerTable),
      );

      const historyBefore = await readHistory();

      const result = await boundary.run(
        restore(access, entry.id).pipe(Effect.result),
      );

      expect(result).toMatchObject({
        failure: { body: { code: "EVENT_TIMER_CANNOT_BE_RESET" } },
      });
      expect(await boundary.run(database.select().from(timerTable))).toEqual(
        timersBefore,
      );
      expect(await readHistory()).toEqual(historyBefore);
      expect(publications).toEqual([]);
      expect(
        await boundary.run(
          makeTimerHistory(database).getHistory(
            access,
            original.world,
            original.timerKey,
            1,
          ),
        ),
      ).toMatchObject([{ id: entry.id, canRestore: false }]);
    } finally {
      await boundary.dispose();
    }
  },
);
