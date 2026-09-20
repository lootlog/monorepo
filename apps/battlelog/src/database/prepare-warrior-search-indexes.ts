import { Effect } from "effect";
import type { Client } from "pg";

const searchIndexes = [
  {
    table: "battle_warriors",
    name: "battle_warriors_battleId_name_id_idx",
    columns: '"battleId", name, id DESC NULLS LAST',
  },
  {
    table: "battles",
    name: "battles_userId_id_idx",
    columns: '"userId", id',
  },
];

type IndexPreparation = {
  exists: boolean;
  valid: boolean | null;
  matches: boolean | null;
  create: string;
  drop: string;
};

export const prepareWarriorSearchIndexes = Effect.fn(
  "BattlelogMigration_prepareWarriorSearchIndexes",
)(function* (client: Client) {
  for (const index of searchIndexes) {
    // Catalog inspection and concurrent DDL run outside Drizzle's transactional
    // migrator. PostgreSQL quotes identifiers; column lists are fixed above.
    const { rows } = yield* Effect.tryPromise(() =>
      client.query<IndexPreparation>(
        `SELECT existing.oid IS NOT NULL AS exists,
                definition.indisvalid AS valid,
                definition.indrelid = relation.oid
                  AND pg_get_indexdef(definition.indexrelid) = format(
                    'CREATE INDEX %I ON %I.%I USING btree (%s)',
                    $2::text, namespace.nspname, relation.relname, $3::text
                  ) AS matches,
                format('CREATE INDEX CONCURRENTLY %I ON %I.%I (%s)',
                  $2::text, namespace.nspname, relation.relname, $3::text) AS create,
                format('DROP INDEX CONCURRENTLY %I.%I',
                  namespace.nspname, $2::text) AS drop
         FROM pg_class relation
         JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
         LEFT JOIN pg_class existing
           ON existing.relnamespace = relation.relnamespace AND existing.relname = $2
         LEFT JOIN pg_index definition ON definition.indexrelid = existing.oid
         WHERE relation.oid = to_regclass($1)`,
        [index.table, index.name, index.columns],
      ),
    );

    const preparation = rows[0];

    // The unchanged SQL migrations bootstrap tables and indexes on a fresh DB.
    if (!preparation) continue;

    if (preparation.exists && !preparation.matches) {
      return yield* Effect.fail(
        new Error(`Index ${index.name} has an unexpected definition`),
      );
    }

    if (preparation.valid) continue;

    if (preparation.exists) {
      yield* Effect.logInfo(`Removing interrupted index build ${index.name}`);
      yield* Effect.tryPromise(() => client.query(preparation.drop));
    }

    yield* Effect.logInfo(`Building index ${index.name} concurrently`);
    yield* Effect.tryPromise(() => client.query(preparation.create));
  }
});
