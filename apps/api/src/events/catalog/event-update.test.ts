import { Capability, createAccessPolicy } from "@lootlog/domain/access-policy";
import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  eventTable,
  eventHeroNpcTable,
  guildTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { UpdateEventRequest } from "#src/contracts/events/schemas";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import { makeEventUpdate } from "#src/events/catalog/event-update";

describe("event update Effect module", () => {
  it.each([
    {
      name: "rejects an inverted range without changing persistence",
      data: {
        startsAt: "2026-09-02T13:00:00.000Z",
        endsAt: "2026-09-02T12:00:00.000Z",
      },
      rejects: true,
    },
    {
      name: "rejects replacing hidden heroes without changing persistence",
      data: { heroNpcs: [] },
      rejects: true,
    },
    {
      name: "clears a scheduled end time with an explicit null request",
      data: { endsAt: null },
      rejects: false,
    },
  ])("$name", async ({ data, rejects }) => {
    const boundary = await createDatabaseBoundary();
    try {
      const database = boundary.database;
      const startsAt = new Date("2026-09-02T10:00:00.000Z");
      const endsAt = new Date("2026-09-02T12:00:00.000Z");
      await boundary.run(
        database.insert(guildTable).values({
          id: "guild-1",
          name: "Guild",
          ownerId: "owner",
          updatedAt: startsAt,
        }),
      );
      await boundary.run(
        database.insert(eventTable).values({
          id: "event-1",
          guildId: "guild-1",
          name: "Event",
          world: "tempest",
          startsAt,
          endsAt,
          updatedAt: startsAt,
        }),
      );
      await boundary.run(
        database.insert(eventHeroNpcTable).values({
          id: "hidden",
          eventId: "event-1",
          npcName: "Hidden",
          npcLvl: 300,
        }),
      );
      const logger = { warn: () => undefined };
      const catalog = makeEventsCatalogRead(
        database,
        {
          getOrSetJsonEffect: () =>
            Effect.die("Mutation hydration must read durable state"),
        },
        logger,
      );
      const updateEvent = makeEventUpdate(
        database,
        { deleteByPattern: () => Promise.resolve(0) },
        catalog,
        logger,
      );
      const request = Schema.decodeUnknownSync(UpdateEventRequest)(data);
      const result = boundary.run(
        updateEvent(
          { id: "guild-1" },
          "event-1",
          request,
          [],
          createAccessPolicy({
            capabilities: [Capability.LOOTLOG_EVENTS_MANAGE],
          }),
        ),
      );
      if (rejects) {
        await expect(result).rejects.toBeInstanceOf(
          "heroNpcs" in data ? ResourceNotFoundError : InvalidRequestError,
        );
      } else {
        const updated = await result;
        expect(updated.endsAt).toBeNull();
        expect(updated.heroNpcs).toEqual([]);
      }
      expect(
        await boundary.run(database.select().from(eventHeroNpcTable)),
      ).toHaveLength(1);
      const rows = await boundary.run(
        database.select().from(eventTable).where(eq(eventTable.id, "event-1")),
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.startsAt).toEqual(startsAt);
      expect(rows[0]?.endsAt).toEqual(rejects ? endsAt : null);
    } finally {
      await boundary.dispose();
    }
  });
});
