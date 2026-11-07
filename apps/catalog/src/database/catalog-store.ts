import { SEARCH_INDEX_PRIMARY_KEY } from "@lootlog/meilisearch/index-settings";
import {
  completeMeilisearchTask,
  type SearchOperationFailure,
} from "@lootlog/meilisearch/operation-failure";
import { and, arrayContains, eq, inArray, sql } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import type { SqlError } from "effect/sql/SqlError";
import { Effect } from "effect";
import { chunk } from "es-toolkit";
import type { Meilisearch } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";
import type { CatalogDatabaseValue } from "./database.js";
import { catalogItemTable, catalogNpcTable } from "./schema.js";

/** The fields the writers look an item entry up by; the rest is the index's. */
export type ItemDocumentKeys = {
  readonly uid: string;
  readonly id: number;
  readonly gameVersion: string;
  readonly droppedByMonsterKeys?: ReadonlyArray<string>;
};

export type NpcDocumentKeys = {
  readonly uid: string;
  readonly monsterKey: string;
};

type Transaction = Parameters<
  Parameters<CatalogDatabaseValue["transaction"]>[0]
>[0];

const PROJECTION_BATCH = 500;

const READ_BATCH = 1000;

/**
 * The reads and writes one catalog change makes. Saving writes the entries
 * to PostgreSQL and replaces them in the search index before the change
 * commits, so the index never holds an entry the database lost; a failed
 * projection rolls the change back and its deliveries are retried.
 */
export type CatalogChange<Item, Npc> = {
  readonly itemsByUids: (
    uids: ReadonlyArray<string>,
  ) => Effect.Effect<Item[], EffectDrizzleQueryError>;
  readonly itemsByMonsterKey: (
    monsterKey: string,
  ) => Effect.Effect<Item[], EffectDrizzleQueryError>;
  readonly itemsByIds: (
    gameVersion: string,
    ids: ReadonlyArray<number>,
  ) => Effect.Effect<Item[], EffectDrizzleQueryError>;
  readonly saveItems: (
    items: ReadonlyArray<Item>,
  ) => Effect.Effect<void, CatalogWriteFailure>;
  readonly npcsByUids: (
    uids: ReadonlyArray<string>,
  ) => Effect.Effect<Npc[], EffectDrizzleQueryError>;
  readonly npcsByMonsterKeys: (
    monsterKeys: ReadonlyArray<string>,
  ) => Effect.Effect<Npc[], EffectDrizzleQueryError>;
  readonly saveNpcs: (
    npcs: ReadonlyArray<Npc>,
  ) => Effect.Effect<void, CatalogWriteFailure>;
};

/** Why a catalog change did not commit; only a rejected search request is final. */
export type CatalogWriteFailure =
  | EffectDrizzleQueryError
  | SearchOperationFailure
  | SqlError;

const documents = <Document>(rows: ReadonlyArray<{ document: object }>) =>
  // SAFETY: `saveItems` and `saveNpcs` are the only writers of these columns,
  // and each stores the documents of its own table's type.
  rows.map(({ document }) => document as Document);

export const makeCatalogStore = <
  Item extends ItemDocumentKeys,
  Npc extends NpcDocumentKeys,
>(
  database: CatalogDatabaseValue,
  meilisearch: Meilisearch,
) => {
  const project = (indexName: string, entries: ReadonlyArray<object>) =>
    Effect.forEach(
      chunk([...entries], PROJECTION_BATCH),
      (batch) =>
        completeMeilisearchTask(`catalog.${indexName}.project`, () =>
          meilisearch
            .index(indexName)
            .addDocuments(batch, { primaryKey: SEARCH_INDEX_PRIMARY_KEY }),
        ),
      { discard: true },
    );

  const change = (transaction: Transaction): CatalogChange<Item, Npc> => ({
    itemsByUids: (uids) =>
      Effect.forEach(chunk([...uids], READ_BATCH), (batch) =>
        transaction
          .select({ document: catalogItemTable.document })
          .from(catalogItemTable)
          .where(inArray(catalogItemTable.uid, batch)),
      ).pipe(Effect.map((pages) => documents<Item>(pages.flat()))),
    itemsByMonsterKey: (monsterKey) =>
      transaction
        .select({ document: catalogItemTable.document })
        .from(catalogItemTable)
        .where(arrayContains(catalogItemTable.monsterKeys, [monsterKey]))
        .pipe(Effect.map(documents<Item>)),
    itemsByIds: (gameVersion, ids) =>
      Effect.forEach(chunk([...ids], READ_BATCH), (batch) =>
        transaction
          .select({ document: catalogItemTable.document })
          .from(catalogItemTable)
          .where(
            and(
              eq(catalogItemTable.gameVersion, gameVersion),
              inArray(catalogItemTable.itemId, batch),
            ),
          ),
      ).pipe(Effect.map((pages) => documents<Item>(pages.flat()))),
    saveItems: (items) =>
      Effect.gen(function* () {
        for (const batch of chunk([...items], PROJECTION_BATCH)) {
          yield* transaction
            .insert(catalogItemTable)
            .values(
              batch.map((item) => ({
                uid: item.uid,
                gameVersion: item.gameVersion,
                itemId: item.id,
                monsterKeys: [...(item.droppedByMonsterKeys ?? [])],
                document: item,
              })),
            )
            .onConflictDoUpdate({
              target: catalogItemTable.uid,
              set: {
                gameVersion: sql`excluded."gameVersion"`,
                itemId: sql`excluded."itemId"`,
                monsterKeys: sql`excluded."monsterKeys"`,
                document: sql`excluded."document"`,
                updatedAt: sql`now()`,
              },
            });
        }

        yield* project(ITEMS_INDEX, items);
      }),
    npcsByUids: (uids) =>
      Effect.forEach(chunk([...uids], READ_BATCH), (batch) =>
        transaction
          .select({ document: catalogNpcTable.document })
          .from(catalogNpcTable)
          .where(inArray(catalogNpcTable.uid, batch)),
      ).pipe(Effect.map((pages) => documents<Npc>(pages.flat()))),
    npcsByMonsterKeys: (monsterKeys) =>
      Effect.forEach(chunk([...monsterKeys], READ_BATCH), (batch) =>
        transaction
          .select({ document: catalogNpcTable.document })
          .from(catalogNpcTable)
          .where(inArray(catalogNpcTable.monsterKey, batch)),
      ).pipe(Effect.map((pages) => documents<Npc>(pages.flat()))),
    saveNpcs: (npcs) =>
      Effect.gen(function* () {
        for (const batch of chunk([...npcs], PROJECTION_BATCH)) {
          yield* transaction
            .insert(catalogNpcTable)
            .values(
              batch.map((npc) => ({
                uid: npc.uid,
                monsterKey: npc.monsterKey,
                document: npc,
              })),
            )
            .onConflictDoUpdate({
              target: catalogNpcTable.uid,
              set: {
                monsterKey: sql`excluded."monsterKey"`,
                document: sql`excluded."document"`,
                updatedAt: sql`now()`,
              },
            });
        }

        yield* project(NPCS_INDEX, npcs);
      }),
  });

  /**
   * Runs one catalog change. Changes run one at a time across every
   * consumer and replica, so the index receives entries in the order the
   * database committed them.
   */
  const write = <A, E>(
    run: (change: CatalogChange<Item, Npc>) => Effect.Effect<A, E>,
  ) =>
    database.transaction((transaction) =>
      Effect.gen(function* () {
        yield* transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext('lootlog:catalog:writer'))`,
        );

        return yield* run(change(transaction));
      }),
    );

  return { write };
};
