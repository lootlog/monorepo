import { compareNpcsStrongestFirst } from "@lootlog/domain/npc-type";
import type {
  LootDrawOutcome,
  LootDrawResolvedNotificationEvent,
} from "@lootlog/schema/notifications";
import { Effect } from "effect";
import type { LootDrawResponse } from "#src/contracts/loots/schemas";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { lootDrawAnnouncementOutboxTable } from "#src/database/drizzle/loot-draw-announcement-outbox.schema";
import type { LootQueryResult } from "#src/loots/query/loot-query-result";
import { makeOutboxDispatcher } from "@lootlog/database/outbox";

const drawResolvedEvent = (
  guildId: string,
  loot: LootQueryResult,
  draw: LootDrawResponse,
  outcome: LootDrawOutcome,
): LootDrawResolvedNotificationEvent | null => {
  const item = loot.items.find(({ hid }) => hid === draw.itemHid);

  if (!item) return null;

  const [npc] = loot.npcs.toSorted((left, right) =>
    compareNpcsStrongestFirst(
      { ...left, npcId: left.id },
      { ...right, npcId: right.id },
    ),
  );

  return {
    guildId,
    world: loot.world,
    lootId: loot.id,
    outcome,
    item: { hid: item.hid, name: item.name, icon: item.icon, lvl: item.lvl },
    npcName: npc?.name ?? null,
    draw: {
      id: draw.id,
      entrants: draw.entrants.map(({ name, prof, lvl, tickets }) => ({
        name,
        prof,
        lvl,
        tickets,
      })),
      winnerIndex: draw.winnerIndex,
      drawnBy: draw.createdBy.name,
      voided: draw.voided && {
        by: draw.voided.by.name,
        reason: draw.voided.reason,
      },
    },
  };
};

export const makeLootDrawAnnouncementDispatcher = <ReadError, PublishError>(
  database: typeof ApiDatabase.Service,
  read: {
    readonly loot: (
      guildId: string,
      lootId: number,
    ) => Effect.Effect<LootQueryResult | null, ReadError>;
    readonly draws: (
      guildId: string,
      lootId: number,
    ) => Effect.Effect<ReadonlyArray<LootDrawResponse>, ReadError>;
  },
  publish: (
    event: LootDrawResolvedNotificationEvent,
    messageId: string,
  ) => Effect.Effect<void, PublishError>,
) =>
  makeOutboxDispatcher(
    "LootDrawAnnouncementOutbox",
    database,
    lootDrawAnnouncementOutboxTable,
    (row) =>
      Effect.gen(function* () {
        const loot = yield* read.loot(row.guildId, row.lootId);
        const draws = loot ? yield* read.draws(row.guildId, row.lootId) : [];
        const draw = draws.find(({ id }) => id === row.drawId);

        const event =
          loot && draw
            ? drawResolvedEvent(row.guildId, loot, draw, row.outcome)
            : null;

        if (!event) return;

        yield* publish(event, `loot-draw-announcement:${row.id}`);
      }),
  );
