import type { GameVersion } from "@lootlog/schema/game-version";
import type { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import { SEARCH_INDEX_PRIMARY_KEY } from "@lootlog/meilisearch/index-settings";
import {
  completeMeilisearchTask,
  type SearchOperationFailure,
} from "@lootlog/meilisearch/operation-failure";
import { and, arrayContains, asc, eq, inArray, sql } from "drizzle-orm";
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

/** An item id and the name its page goes by. */
export type CatalogItemName = { readonly id: number; readonly name: string };

/** What the catalog index needs of a current NPC identity. */
export type CatalogNpcName = {
  readonly id: number;
  readonly name: string;
  readonly type: string | null;
  readonly gameVersion: GameVersion;
  readonly identityNamespace: NpcIdentityNamespace;
};

/**
 * Lookups by key and whole-catalog listings, answered from PostgreSQL: the
 * search index stays for searching and filtering.
 */
export type CatalogReads<Npc> = {
  readonly monsterKeyOf: (
    npcKey: string,
  ) => Effect.Effect<string | undefined, EffectDrizzleQueryError>;
  readonly npcsByUids: (
    uids: ReadonlyArray<string>,
  ) => Effect.Effect<Npc[], EffectDrizzleQueryError>;
  readonly npcsByMonsterKeys: (
    monsterKeys: ReadonlyArray<string>,
  ) => Effect.Effect<Npc[], EffectDrizzleQueryError>;
  readonly itemNames: (
    gameVersion: string | undefined,
  ) => Effect.Effect<CatalogItemName[], EffectDrizzleQueryError>;
  readonly currentNpcNames: (
    gameVersion: string | undefined,
  ) => Effect.Effect<CatalogNpcName[], EffectDrizzleQueryError>;
};

/**
 * The reads and writes one catalog change makes. Saving writes the entries
 * to PostgreSQL and replaces them in the search index before the change
 * commits, so a failed projection rolls the change back and its deliveries
 * are retried. A commit that fails after the projection leaves the index
 * ahead of the database until the entry's next change or a rebuild.
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

  const npcLookups = (executor: CatalogDatabaseValue | Transaction) => ({
    npcsByUids: (uids: ReadonlyArray<string>) =>
      Effect.forEach(chunk([...uids], READ_BATCH), (batch) =>
        executor
          .select({ document: catalogNpcTable.document })
          .from(catalogNpcTable)
          .where(inArray(catalogNpcTable.uid, batch)),
      ).pipe(Effect.map((pages) => documents<Npc>(pages.flat()))),
    npcsByMonsterKeys: (monsterKeys: ReadonlyArray<string>) =>
      Effect.forEach(chunk([...monsterKeys], READ_BATCH), (batch) =>
        executor
          .select({ document: catalogNpcTable.document })
          .from(catalogNpcTable)
          .where(inArray(catalogNpcTable.monsterKey, batch)),
      ).pipe(Effect.map((pages) => documents<Npc>(pages.flat()))),
  });

  const npcDocument = (field: string) =>
    sql`${catalogNpcTable.document}->>${field}`;

  const read: CatalogReads<Npc> = {
    ...npcLookups(database),
    monsterKeyOf: (npcKey) =>
      database
        .select({ monsterKey: catalogNpcTable.monsterKey })
        .from(catalogNpcTable)
        .where(eq(catalogNpcTable.uid, npcKey))
        .limit(1)
        .pipe(Effect.map((rows) => rows[0]?.monsterKey)),
    // An id the game gave to a later item names that item now, so of the
    // entries of one id the latest seen gives its name, as its page shows it.
    itemNames: (gameVersion) =>
      database
        .selectDistinctOn([catalogItemTable.itemId], {
          id: catalogItemTable.itemId,
          name: sql<string>`${catalogItemTable.document}->>'name'`,
        })
        .from(catalogItemTable)
        .where(
          gameVersion === undefined
            ? undefined
            : eq(catalogItemTable.gameVersion, gameVersion),
        )
        .orderBy(
          asc(catalogItemTable.itemId),
          sql`(${catalogItemTable.document}->>'firstSeenAt')::bigint desc nulls last`,
          asc(catalogItemTable.uid),
        ),
    currentNpcNames: (gameVersion) =>
      database
        .select({
          id: sql<number>`(${npcDocument("id")})::integer`,
          name: sql<string>`${npcDocument("name")}`,
          type: sql<string | null>`${npcDocument("type")}`,
          gameVersion: sql<GameVersion>`${npcDocument("gameVersion")}`,
          identityNamespace: sql<NpcIdentityNamespace>`${npcDocument("identityNamespace")}`,
        })
        .from(catalogNpcTable)
        .where(
          and(
            gameVersion === undefined
              ? undefined
              : eq(npcDocument("gameVersion"), gameVersion),
            // A monster's former identities are history, not current NPCs.
            sql`${catalogNpcTable.document}->'current' is distinct from 'false'::jsonb`,
          ),
        )
        .orderBy(asc(catalogNpcTable.uid)),
  };

  const change = (transaction: Transaction): CatalogChange<Item, Npc> => ({
    ...npcLookups(transaction),
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

  return { read, write };
};
