import { describe, expect, it } from "bun:test";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeEventTimerStore } from "./event-timer.store.js";

describe("event timer name lookup", () => {
  it.each([
    { names: ["Anielska zabójczyni"] },
    { names: ["Anielska zabójczyni", "O'Connor, {hero}"] },
  ])(
    "matches literal hero names and isolates Organization and world (%j)",
    async ({ names }) => {
      const boundary = await createDatabaseBoundary();
      try {
        const database = boundary.database;
        await boundary.run(
          database
            .insert(guildTable)
            .values([
              createGuildFixture({ id: "guild-a" }),
              createGuildFixture({ id: "guild-b" }),
            ]),
        );
        await boundary.run(
          database
            .insert(memberTable)
            .values(createMemberFixture({ guildId: "guild-a" })),
        );
        const timer = (
          name: string,
          index: number,
          guildId = "guild-a",
          world = "Aldous",
        ) => ({
          guildId,
          world,
          timerKey: `hero-${index}`,
          npcId: index,
          createdById: 1,
          npc: { name },
          minSpawnTime: new Date(0),
          maxSpawnTime: new Date(1000),
          updatedAt: new Date(0),
        });
        await boundary.run(
          database
            .insert(timerTable)
            .values([
              ...names.map((name, index) => timer(name, index)),
              timer("Unrelated", 50),
              timer(names[0], 51, "guild-b"),
              timer(names[0], 52, "guild-a", "Other"),
            ]),
        );
        const result = await boundary.run(
          makeEventTimerStore(database).findEventHeroTimersByNames(
            "guild-a",
            "Aldous",
            [...names],
          ),
        );
        expect(result.map((row) => row.timerKey).sort()).toEqual(
          names.map((_, index) => `hero-${index}`).sort(),
        );
      } finally {
        await boundary.dispose();
      }
    },
  );
});
