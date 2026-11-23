import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { Effect, Result } from "effect";
import { ApiDatabase } from "../src/database/drizzle/database.js";
import {
  eventHeroNpcTable,
  eventTable,
} from "../src/database/drizzle/event.schema.js";
import { makeEventCatalogMutations } from "../src/events/catalog/event-catalog-mutations.js";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { makeKillRankingFixture } from "./kill-rankings-fixtures.js";

const { runtime, guildId, seed, cleanup } = makeKillRankingFixture();

beforeAll(seed);

afterAll(cleanup);

test("concurrent hero renames onto one name give it to exactly one hero", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      const eventId = randomUUID();
      const now = new Date();

      const mutations = makeEventCatalogMutations(db, {
        invalidateScopes: () => Effect.void,
        deleteByPattern: () => Effect.succeed(0),
      });

      yield* db.insert(eventTable).values({
        id: eventId,
        guildId,
        name: "Hero names",
        world: "a",
        updatedAt: now,
      });
      yield* db.insert(eventHeroNpcTable).values(
        ["a", "b"].map((key) => ({
          id: `${eventId}-${key}`,
          eventId,
          npcName: `Heros ${key}`,
        })),
      );

      const guild = { id: guildId };
      const npcName = "Wspólna nazwa";

      const holdHeroes = db.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .select({ id: eventHeroNpcTable.id })
            .from(eventHeroNpcTable)
            .where(eq(eventHeroNpcTable.eventId, eventId))
            .for("update");
          yield* transaction.execute(sql`select pg_sleep(0.5)`);
        }),
      );

      const rename = (heroId: string) =>
        Effect.result(
          Effect.andThen(
            Effect.sleep("100 millis"),
            mutations.updateHero(guild, eventId, heroId, { npcName }),
          ),
        );

      const [, ...results] = yield* Effect.all(
        [holdHeroes, rename(`${eventId}-a`), rename(`${eventId}-b`)],
        { concurrency: "unbounded" },
      );

      const failures = results.flatMap((result) =>
        Result.isFailure(result) ? [result.failure] : [],
      );

      expect(failures).toHaveLength(1);
      expect(
        failures.every((failure) => failure instanceof ResourceConflictError),
      ).toBe(true);
      expect(
        yield* db
          .select({ id: eventHeroNpcTable.id })
          .from(eventHeroNpcTable)
          .where(eq(eventHeroNpcTable.npcName, npcName)),
      ).toHaveLength(1);
    }),
  );
});

test("renaming a hero deleted while the rename waits for its row is a 404", async () => {
  await runtime.runPromise(
    Effect.gen(function* () {
      const db = yield* ApiDatabase;
      const eventId = randomUUID();
      const heroId = `${eventId}-a`;

      const mutations = makeEventCatalogMutations(db, {
        invalidateScopes: () => Effect.void,
        deleteByPattern: () => Effect.succeed(0),
      });

      yield* db.insert(eventTable).values({
        id: eventId,
        guildId,
        name: "Deleted hero rename",
        world: "a",
        updatedAt: new Date(),
      });
      yield* db
        .insert(eventHeroNpcTable)
        .values({ id: heroId, eventId, npcName: "Heros" });

      const deleteHero = db.transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .delete(eventHeroNpcTable)
            .where(eq(eventHeroNpcTable.id, heroId));
          yield* transaction.execute(sql`select pg_sleep(0.5)`);
        }),
      );

      const [, renamed] = yield* Effect.all(
        [
          deleteHero,
          Effect.result(
            Effect.andThen(
              Effect.sleep("100 millis"),
              mutations.updateHero({ id: guildId }, eventId, heroId, {
                npcName: "Nowa nazwa",
              }),
            ),
          ),
        ],
        { concurrency: "unbounded" },
      );

      expect(
        Result.isFailure(renamed) &&
          renamed.failure instanceof ResourceNotFoundError,
      ).toBe(true);
    }),
  );
});
