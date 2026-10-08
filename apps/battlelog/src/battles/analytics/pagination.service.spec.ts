import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { PgliteClient } from "@effect/sql-pglite";
import { eq } from "drizzle-orm";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { Effect, ManagedRuntime } from "effect";
import { createBattleId } from "#src/battles/battle-id";
import { relations } from "#src/database/relations";
import { battles } from "#src/database/schema";
import { InvalidRequestError } from "#src/infrastructure/http-error";
import type { SortOrder } from "#src/battles/catalog/query-battles";
import { makeBattlePagination } from "./pagination.service.js";

const runtime = ManagedRuntime.make(PgliteClient.layer({}));

const databaseEffect = makeWithDefaults({ relations });

let database: Effect.Success<typeof databaseEffect>;

const FIRST_BATTLE_AT = Date.UTC(2026, 9, 4, 12);

// Milliseconds after FIRST_BATTLE_AT; two battles share a millisecond.
const OWNER_BATTLE_OFFSETS = [0, 1, 2, 2, 5, 8, 13, 21];

const ownerBattleIds: string[] = [];

beforeAll(async () => {
  database = await runtime.runPromise(databaseEffect);
  await runtime.runPromise(
    migrate(database, {
      migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname,
    }),
  );

  const insert = (userId: string, offset: number) => {
    const battleId = createBattleId(FIRST_BATTLE_AT + offset);

    return runtime
      .runPromise(
        database.insert(battles).values({
          ...battleId,
          userId,
          accountId: "account",
          characterId: "character",
          world: "world",
          duration: 10,
          type: "1v1",
          winner: "Winner",
          loser: "Loser",
          winningTeam: 1,
          losingTeam: 2,
        }),
      )
      .then(() => battleId.id);
  };

  for (const offset of OWNER_BATTLE_OFFSETS) {
    ownerBattleIds.push(await insert("owner", offset));
  }

  await insert("other-owner", 3);
}, 60_000);

afterAll(() => runtime.dispose());

const pagination = () =>
  makeBattlePagination(database, (effect) => effect).paginateBattles;

const page = (sortOrder: SortOrder, cursor?: string) =>
  runtime.runPromise(
    pagination()((table) => eq(table.userId, "owner"), {
      size: 3,
      sortOrder,
      includeTotal: false,
      cursor,
    }),
  );

const ids = (result: Awaited<ReturnType<typeof page>>) =>
  result.data.map((battle) => battle.id);

describe("battle list pagination against PostgreSQL", () => {
  for (const sortOrder of ["desc", "asc"] as const) {
    it(`pages through a whole ${sortOrder} history and back without duplicates or gaps`, async () => {
      const expected =
        sortOrder === "desc"
          ? ownerBattleIds.slice().reverse()
          : ownerBattleIds;

      const forward = [await page(sortOrder)];

      while (forward.at(-1).pagination.nextCursor) {
        forward.push(
          await page(sortOrder, forward.at(-1).pagination.nextCursor),
        );
      }

      expect(forward.flatMap(ids)).toEqual(expected);
      expect(forward.map((result) => result.pagination.hasPrev)).toEqual([
        false,
        true,
        true,
      ]);

      const backward = [forward.at(-1)];

      while (backward.at(-1).pagination.previousCursor) {
        backward.push(
          await page(sortOrder, backward.at(-1).pagination.previousCursor),
        );
      }

      expect(backward.map(ids)).toEqual(forward.map(ids).reverse());
      expect(backward.at(-1).pagination).toMatchObject({
        hasPrev: false,
        hasNext: true,
      });
    });
  }

  it("rejects a malformed cursor instead of returning the first page", async () => {
    const previousFormat = `${new Date(FIRST_BATTLE_AT).toISOString()}_${ownerBattleIds[0]}`;

    for (const cursor of [previousFormat, "not-a-cursor"]) {
      await expect(page("desc", cursor)).rejects.toBeInstanceOf(
        InvalidRequestError,
      );
    }
  });
});

describe("battle list count", () => {
  it("fails an exhausted filtered count without submitting the same expensive read again", async () => {
    const failure = new Error("canceling statement due to statement timeout");

    const where = mock()
      .mockReturnValueOnce(Effect.fail(failure))
      .mockReturnValueOnce(Effect.succeed([{ count: 2 }]));

    const paginate = makeBattlePagination(
      // SAFETY: the count path only reads `findMany`, `select().from().where()` and `execute`.
      {
        query: { battles: { findMany: () => Effect.succeed([]) } },
        select: () => ({ from: () => ({ where }) }),
        execute: mock(),
      } as never,
      (effect) => effect,
    ).paginateBattles;

    await expect(
      Effect.runPromise(
        paginate((table) => eq(table.userId, "owner"), {
          size: 2,
          sortOrder: "desc",
          includeTotal: true,
        }),
      ),
    ).rejects.toBe(failure);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
