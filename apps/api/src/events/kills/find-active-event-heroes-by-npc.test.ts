import { expect, it } from "bun:test";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../test/organization-fixtures.js";
import {
  eventHeroNpcTable,
  eventTable,
  guildTable,
} from "#src/database/drizzle/schema";
import { makeActiveEventHeroStore } from "./active-event-hero.repository.js";
import { findActiveEventHeroesByNpc } from "./find-active-event-heroes-by-npc.js";

it("credits a kill to a hero typed with the NPC's spelling before a Margonem rename", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    const now = new Date();

    await boundary.run(
      database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      database.insert(eventTable).values({
        id: "halloween",
        guildId: "guild-1",
        name: "Halloween",
        world: "Aldous",
        startsAt: new Date(now.getTime() - 60_000),
        updatedAt: now,
      }),
    );
    await boundary.run(
      database.insert(eventHeroNpcTable).values([
        { id: "doppelganger", eventId: "halloween", npcName: "Doppelgänger" },
        { id: "drude", eventId: "halloween", npcName: "Drude" },
        {
          id: "other-npc",
          eventId: "halloween",
          npcId: 415999,
          npcName: "DOPPELGANGER",
        },
      ]),
    );

    const matches = await boundary.run(
      findActiveEventHeroesByNpc(
        makeActiveEventHeroStore(database),
        "guild-1",
        "Aldous",
        415782,
        "Doppelganger",
      ),
    );

    expect(matches.map(({ eventHero }) => eventHero.id)).toEqual([
      "doppelganger",
    ]);
  } finally {
    await boundary.dispose();
  }
});
