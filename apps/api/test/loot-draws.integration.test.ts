import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  lootTable,
  memberTable,
  organizationLootRecordTable,
} from "../src/database/drizzle/schema.js";
import { ErrorKey } from "../src/loots/error-key.js";
import { makeLootPersistence } from "../src/loots/loot-persistence.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "./organization-fixtures.js";

const runtime = ManagedRuntime.make(ApiDatabaseLive);

const guildId = "loot-draws-guild";

const discordId = "discord-draws";

const entrants = [
  {
    name: "Rozdaje Kolby",
    accountId: 1,
    characterId: 1,
    prof: "MAGE" as const,
    lvl: 302,
    icon: null,
    source: "WINNER" as const,
    tickets: 2,
  },
  {
    name: "Spoza Grupy",
    accountId: 2,
    characterId: 2,
    prof: "MAGE" as const,
    lvl: 290,
    icon: null,
    source: "MAP" as const,
    tickets: 1,
  },
];

const seedLoot = Effect.gen(function* () {
  const db = yield* ApiDatabase;

  yield* db.insert(guildTable).values(createGuildFixture({ id: guildId }));

  const { id: _id, ...member } = createMemberFixture({
    guildId,
    userId: discordId,
    globalUserId: "user-draws",
  });

  yield* db.insert(memberTable).values(member);

  const [loot] = yield* db
    .insert(lootTable)
    .values({
      gameVersion: "pl",
      uniqueId: crypto.randomUUID(),
      world: "luvia",
      source: "FIGHT",
      location: "Katakumby",
      updatedAt: new Date(),
    })
    .returning();

  if (!loot) throw new Error("Missing loot fixture");

  yield* db
    .insert(organizationLootRecordTable)
    .values({ guildId, lootId: loot.id, updatedAt: new Date() });

  return loot.id;
});

describe("loot draws against migrated PostgreSQL", () => {
  beforeEach(() =>
    runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        yield* db.execute(sql`TRUNCATE TABLE "Guild" RESTART IDENTITY CASCADE`);
      }),
    ),
  );
  afterAll(() => runtime.dispose());

  it("keeps one standing result per item until it is voided", async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const lootId = yield* seedLoot;
        const persistence = makeLootPersistence(yield* ApiDatabase);

        const draw = {
          discordId,
          guildId,
          lootId,
          itemHid: "wand-hid",
          entrants,
          roll: 2,
          winnerIndex: 1,
        };

        const first = yield* persistence.createDraw(draw);

        // A retried request must not add a second result for the item.
        const retried = yield* persistence.createDraw(draw).pipe(Effect.flip);

        expect(retried).toMatchObject({
          body: { code: ErrorKey.LOOT_DRAW_ALREADY_EXISTS },
        });

        const voided = yield* persistence.voidDraw({
          discordId,
          guildId,
          lootId,
          drawId: first.id,
          reason: "Wróg na liście",
        });

        expect(voided.voided).toMatchObject({ reason: "Wróg na liście" });

        const voidedAgain = yield* persistence
          .voidDraw({
            discordId,
            guildId,
            lootId,
            drawId: first.id,
            reason: "Drugi raz",
          })
          .pipe(Effect.flip);

        expect(voidedAgain).toMatchObject({
          body: { code: ErrorKey.LOOT_DRAW_ALREADY_VOIDED },
        });

        const redrawn = yield* persistence.createDraw({ ...draw, roll: 0 });
        const history = yield* persistence.listDraws(guildId, lootId);

        expect(history.map(({ id, voided }) => [id, voided !== null])).toEqual([
          [redrawn.id, false],
          [first.id, true],
        ]);
        expect(history[1]?.entrants).toEqual(entrants);
      }),
    );
  });

  it("keeps another Organization's draws out of reach", async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const lootId = yield* seedLoot;
        const persistence = makeLootPersistence(yield* ApiDatabase);

        const draw = yield* persistence.createDraw({
          discordId,
          guildId,
          lootId,
          itemHid: "wand-hid",
          entrants,
          roll: 0,
          winnerIndex: 0,
        });

        expect(yield* persistence.listDraws("another-guild", lootId)).toEqual(
          [],
        );

        const foreignVoid = yield* persistence
          .voidDraw({
            discordId,
            guildId: "another-guild",
            lootId,
            drawId: draw.id,
            reason: "Obcy",
          })
          .pipe(Effect.flip);

        expect(foreignVoid).toMatchObject({
          body: { code: ErrorKey.LOOT_DRAW_NOT_FOUND },
        });
      }),
    );
  });
});
