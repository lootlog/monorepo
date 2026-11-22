import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { Effect, ManagedRuntime } from "effect";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  memberTable,
} from "../src/database/drizzle/organization.schema.js";
import {
  lootTable,
  organizationLootRecordTable,
} from "../src/database/drizzle/loot.schema.js";
import { ErrorKey } from "../src/loots/error-key.js";
import { makeLootPersistence } from "../src/loots/loot.repository.js";
import { makeLootDrawAnnouncementDispatcher } from "../src/loots/loot-draw-announcement-outbox.js";
import { lootDrawAnnouncementOutboxTable } from "../src/database/drizzle/loot-draw-announcement-outbox.schema.js";
import type { LootQueryResult } from "../src/loots/query/loot-query-result.js";
import type { LootDrawResolvedNotificationEvent } from "@lootlog/schema/notifications";
import { makeLootQueryOperations } from "../src/loots/query/loot-query.operations.js";
import { makeLootQueryPersistence } from "../src/loots/query/loot-query.repository.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "./organization-fixtures.js";
import { createOrganizationLootRecordFixture } from "./loot-fixtures.js";

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

  yield* db.insert(organizationLootRecordTable).values(
    createOrganizationLootRecordFixture({
      guildId,
      lootId: loot.id,
      lootWorld: "luvia",
      updatedAt: new Date(),
    }),
  );

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

        const query = makeLootQueryOperations(
          makeLootQueryPersistence(yield* ApiDatabase),
        );

        const standingDraws = query
          .fetchOrganizationLoot(guildId, lootId)
          .pipe(Effect.map((loot) => loot?.standingDraws));

        const draw = {
          discordId,
          guildId,
          lootId,
          itemHid: "wand-hid",
          entrants,
          ticketOrder: [0, 1, 0],
          roll: 1,
          winnerIndex: 1,
        };

        const first = yield* persistence.createDraw(draw);

        expect(yield* standingDraws).toEqual([
          {
            drawId: first.id,
            itemHid: "wand-hid",
            winner: { name: "Spoza Grupy", prof: "MAGE", lvl: 290 },
          },
        ]);

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
        expect(yield* standingDraws).toEqual([]);

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

        const redrawn = yield* persistence.createDraw({
          ...draw,
          roll: 0,
          winnerIndex: 0,
        });

        expect(yield* standingDraws).toEqual([
          {
            drawId: redrawn.id,
            itemHid: "wand-hid",
            winner: { name: "Rozdaje Kolby", prof: "MAGE", lvl: 302 },
          },
        ]);

        const history = yield* persistence.listDraws(guildId, lootId);

        expect(history.map(({ id, voided }) => [id, voided !== null])).toEqual([
          [redrawn.id, false],
          [first.id, true],
        ]);
        expect(history[1]).toMatchObject({ entrants, ticketOrder: [0, 1, 0] });
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
          ticketOrder: [0, 0, 1],
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

  it("announces each committed outcome from the outbox, even after an outage", async () => {
    await runtime.runPromise(
      Effect.gen(function* () {
        const db = yield* ApiDatabase;
        const lootId = yield* seedLoot;
        const persistence = makeLootPersistence(db);

        const loot: LootQueryResult = {
          id: lootId,
          uniqueId: "loot",
          world: "luvia",
          source: "FIGHT",
          location: "Katakumby",
          lootShare: {},
          mapPlayersSnapshot: null,
          items: [
            {
              id: 1,
              hid: "wand-hid",
              name: "Różdżka",
              icon: "wand.gif",
              stat: "",
              type: null,
              rarity: "LEGENDARY",
              lvl: 300,
              prof: ["MAGE"],
            },
          ],
          players: [],
          npcs: [],
          submissions: [],
          commentsCount: 0,
          likes: [],
          standingDraws: [],
          createdAt: new Date(0),
          updatedAt: new Date(0),
        };

        const draw = yield* persistence.createDraw({
          discordId,
          guildId,
          lootId,
          itemHid: "wand-hid",
          entrants,
          ticketOrder: [0, 0, 1],
          roll: 2,
          winnerIndex: 1,
        });

        yield* persistence.voidDraw({
          discordId,
          guildId,
          lootId,
          drawId: draw.id,
          reason: "Wróg na liście",
        });

        const published: LootDrawResolvedNotificationEvent[] = [];
        let brokerUp = false;

        const dispatch = makeLootDrawAnnouncementDispatcher(
          db,
          {
            loot: () => Effect.succeed(loot),
            draws: (organization, id) =>
              persistence.listDraws(organization, id),
          },
          (event) =>
            brokerUp
              ? Effect.sync(() => void published.push(event))
              : Effect.fail(new Error("broker unavailable")),
        );

        yield* dispatch();
        expect(published).toEqual([]);

        brokerUp = true;
        yield* dispatch();

        expect(
          published.map(({ outcome, item, draw }) => ({
            outcome,
            item: item.name,
            winner: draw.entrants[draw.winnerIndex]?.name,
          })),
        ).toEqual([
          { outcome: "DRAWN", item: "Różdżka", winner: "Spoza Grupy" },
          { outcome: "VOIDED", item: "Różdżka", winner: "Spoza Grupy" },
        ]);
        expect(
          yield* db.select().from(lootDrawAnnouncementOutboxTable),
        ).toEqual([]);
      }),
    );
  });
});
