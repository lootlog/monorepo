import { expect, it } from "bun:test";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../test/organization-fixtures.js";
import {
  eventHeroKillTable,
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { makeEventKillStore } from "./event-kill.repository.js";

it("records one kill per hero respawn window even when Redis no longer remembers it", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database } = boundary;
    const at = new Date("2026-11-02T10:00:00.000Z");

    await boundary.run(
      Effect.gen(function* () {
        yield* database.insert(guildTable).values(createGuildFixture());
        yield* database.insert(eventTable).values({
          id: "event-1",
          guildId: "guild-1",
          name: "Event",
          world: "tempest",
          updatedAt: at,
        });
        yield* database
          .insert(eventHeroNpcTable)
          .values({ id: "hero", eventId: "event-1", npcName: "Hero" });
      }),
    );

    const store = makeEventKillStore(database);

    const record = (windowKey: string, isManualClose = false) =>
      boundary.run(
        store.recordKill(
          {
            heroNpcId: "hero",
            killedAt: at,
            minSpawnTimeAtKill: at,
            maxSpawnTimeAtKill: at,
            isManualClose,
            windowKey,
            mapIds: [],
            assignmentOverlapStart: at,
          },
          () => Effect.succeed([]),
        ),
      );

    expect(await record("1000")).not.toBeNull();
    expect(await record("1000")).toBeNull();
    expect(await record("1000", true)).not.toBeNull();
    expect(await record("2000")).not.toBeNull();

    expect(
      (await boundary.run(database.select().from(eventHeroKillTable)))
        .map(({ windowKey, isManualClose }) => [windowKey, isManualClose])
        .toSorted(),
    ).toEqual([
      ["1000", false],
      ["1000", true],
      ["2000", false],
    ]);
  } finally {
    await boundary.dispose();
  }
});
