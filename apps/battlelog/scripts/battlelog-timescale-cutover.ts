// Moves a Battlelog database that already holds battles onto the TimescaleDB
// schema of `drizzle/20261004153153_battlelog_timescale` while the released
// service keeps running. Run the steps by hand, in order; see drizzle/README.md.
//
//   bun scripts/battlelog-timescale-cutover.ts prepare
//   bun scripts/battlelog-timescale-cutover.ts copy      # repeatable, resumable
//   bun scripts/battlelog-timescale-cutover.ts status
//   bun scripts/battlelog-timescale-cutover.ts cutover   # then release the new service
//   bun scripts/battlelog-timescale-cutover.ts verify
//   bun scripts/battlelog-timescale-cutover.ts cleanup
import { Config, Effect, Redacted } from "effect";
import { Client } from "pg";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const MIGRATION_NAME = "20261004153153_battlelog_timescale";

const MIGRATION_PATH = new URL(
  `../drizzle/${MIGRATION_NAME}/migration.sql`,
  import.meta.url,
);

const NEXT = "battlelog_next";

const OLD = "battlelog_old";

// Tables the cutover moves into `public`; the others stay where they are.
const MOVED_TABLES = [
  "battles",
  "battle_warriors",
  "battle_timelines",
  "battle_submissions",
  "battle_legacy_ids",
];

const config = await Effect.runPromise(
  Config.all({
    url: Config.Redacted("POSTGRESQL_CONNECTION_URI"),
    batchSize: Config.Int("CUTOVER_BATCH_SIZE").pipe(
      Config.withDefault(20_000),
    ),
  }),
);

const log = (message: string) => process.stdout.write(`${message}\n`);

const client = new Client({ connectionString: Redacted.value(config.url) });

const query = async <Row extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) => (await client.query<Row>(text, values)).rows;

const statements = (sql: string) =>
  sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

const readMigration = async () => {
  const text = await readFile(MIGRATION_PATH, "utf8");
  const all = statements(text);
  const begin = all.findIndex((s) => s.startsWith("-- BEGIN battle tables"));
  const end = all.findIndex((s) => s.startsWith("-- END battle tables"));

  if (begin === -1 || end === -1)
    throw new Error("The migration lost its battle table markers");

  return {
    hash: createHash("sha256").update(text).digest("hex"),
    tables: all.slice(begin + 1, end),
    tail: all.slice(end + 1),
  };
};

// The UUIDv7 a battle saved before UUIDv7 IDs receives: its createdAt in the
// first 48 bits, its order among battles of the same millisecond in the next
// 12, and a hash of its old ID in the rest. createdAt is a UTC timestamp.
const legacyBattleId = `(
  lpad(to_hex((extract(epoch FROM "createdAt") * 1000)::bigint), 12, '0')
  || to_hex(28672 + "tieRank")
  || to_hex(32768 + (('x' || substr(md5(id), 1, 4))::bit(16)::int & 16383))
  || substr(md5(id), 5, 12)
)::uuid`;

const warriorColumns = async () =>
  (
    await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'battle_warriors'
         AND column_name NOT IN ('battleId', 'userId')
       ORDER BY ordinal_position`,
      [NEXT],
    )
  ).map((row) => `"${row.column_name}"`);

const battleColumns = async () =>
  (
    await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'battles'
         AND column_name NOT IN ('id', 'createdAt', 'updatedAt')
       ORDER BY ordinal_position`,
      [NEXT],
    )
  ).map((row) => `"${row.column_name}"`);

/**
 * Copies the old battles whose IDs `source` selects, with their submission,
 * participants and legacy ID. `source` is a query over `public.battles`
 * returning `id` and `"createdAt"`; battles already mapped keep their new ID.
 */
const copyBattles = async (source: string, values: unknown[]) => {
  const battles = await battleColumns();
  const warriors = await warriorColumns();

  await query(
    `INSERT INTO ${NEXT}.battle_legacy_ids ("legacyId", "battleId")
     SELECT id, ${legacyBattleId}
     FROM (
       SELECT id, "createdAt",
         (row_number() OVER (PARTITION BY "createdAt" ORDER BY id) - 1)::int AS "tieRank"
       FROM (${source}) AS source
     ) AS ranked
     ON CONFLICT ("legacyId") DO NOTHING`,
    values,
  );

  const copied = await query<{ count: string }>(
    `WITH source AS (${source}),
     inserted AS (
       INSERT INTO ${NEXT}.battles (id, "createdAt", "updatedAt", ${battles.join(", ")})
       SELECT legacy."battleId", old."createdAt" AT TIME ZONE 'UTC',
         old."updatedAt" AT TIME ZONE 'UTC', ${battles.map((c) => `old.${c}`).join(", ")}
       FROM public.battles old
       JOIN source ON source.id = old.id
       JOIN ${NEXT}.battle_legacy_ids legacy ON legacy."legacyId" = old.id
       RETURNING 1
     )
     SELECT count(*) FROM inserted`,
    values,
  );

  await query(
    `INSERT INTO ${NEXT}.battle_submissions ("userId", "submissionId", "battleId")
     SELECT old."userId", old."submissionId", legacy."battleId"
     FROM public.battles old
     JOIN (${source}) AS source ON source.id = old.id
     JOIN ${NEXT}.battle_legacy_ids legacy ON legacy."legacyId" = old.id
     WHERE old."submissionId" IS NOT NULL`,
    values,
  );

  await query(
    `INSERT INTO ${NEXT}.battle_warriors ("battleId", "userId", ${warriors.join(", ")})
     SELECT legacy."battleId", old."userId", ${warriors.map((c) => `warrior.${c}`).join(", ")}
     FROM public.battles old
     JOIN (${source}) AS source ON source.id = old.id
     JOIN ${NEXT}.battle_legacy_ids legacy ON legacy."legacyId" = old.id
     JOIN public.battle_warriors warrior ON warrior."battleId" = old.id`,
    values,
  );

  return Number(copied[0]?.count ?? 0);
};

const progress = async () =>
  (
    await query<{ copiedThrough: string | null }>(
      `SELECT "copiedThrough"::text FROM ${NEXT}.cutover_progress`,
    )
  )[0]?.copiedThrough ?? null;

// Bounds travel as text: old createdAt values are UTC without a time zone, and
// a JavaScript Date would pick up the local offset on the way back.
const batchSource = `SELECT id, "createdAt" FROM public.battles
  WHERE ($1::timestamp IS NULL OR "createdAt" > $1::timestamp)
    AND "createdAt" <= $2::timestamp`;

/** Copies the next whole milliseconds of battles after the watermark. */
const copyNextBatch = async () => {
  const [batch] = await query<{
    from: string | null;
    through: string | null;
    hasWork: boolean;
  }>(
    `UPDATE ${NEXT}.cutover_progress progress SET "copyingThrough" = COALESCE(
       (SELECT "createdAt" FROM public.battles
        WHERE progress."copiedThrough" IS NULL OR "createdAt" > progress."copiedThrough"
        ORDER BY "createdAt" OFFSET $1 LIMIT 1),
       (SELECT max("createdAt") FROM public.battles))
     RETURNING "copiedThrough"::text AS "from", "copyingThrough"::text AS "through",
       "copyingThrough" IS NOT NULL
       AND ("copiedThrough" IS NULL OR "copyingThrough" > "copiedThrough") AS "hasWork"`,
    [config.batchSize - 1],
  );

  if (!batch?.hasWork) return 0;

  const copied = await copyBattles(batchSource, [batch.from, batch.through]);

  await query(
    `UPDATE ${NEXT}.cutover_progress SET "copiedThrough" = "copyingThrough"`,
  );

  return copied;
};

const inTransaction = async <A>(run: () => Promise<A>) => {
  await query("BEGIN");

  try {
    const result = await run();
    await query("COMMIT");

    return result;
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
};

const prepare = async () => {
  const { tables } = await readMigration();

  await inTransaction(async () => {
    await query(
      "CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public",
    );
    await query(`CREATE SCHEMA ${NEXT}`);
    await query(`SET LOCAL search_path TO ${NEXT}, public`);

    for (const statement of tables) await query(statement);

    // Backfilled chunks are compressed once, after the copy; the policy
    // would otherwise compress chunks the copy still inserts into.
    await query(
      `SELECT alter_job(job_id, scheduled => false)
       FROM timescaledb_information.jobs
       WHERE hypertable_schema = $1 AND proc_name = 'policy_compression'`,
      [NEXT],
    );

    await query(
      `CREATE TABLE ${NEXT}.cutover_progress (
         "copiedThrough" timestamp(3), "copyingThrough" timestamp(3)
       )`,
    );
    await query(`INSERT INTO ${NEXT}.cutover_progress VALUES (NULL, NULL)`);
    await query(
      `CREATE TABLE ${NEXT}.cutover_changes ("legacyId" text PRIMARY KEY)`,
    );

    // One function per table: PL/pgSQL resolves every field a statement
    // names, so a shared function would fail on the table without it.
    for (const [table, idColumn] of [
      ["battles", "id"],
      ["battle_warriors", '"battleId"'],
    ]) {
      await query(
        `CREATE FUNCTION ${NEXT}.record_${table}_change() RETURNS trigger
         LANGUAGE plpgsql AS $$
         BEGIN
           IF TG_OP = 'DELETE' THEN
             INSERT INTO ${NEXT}.cutover_changes ("legacyId") VALUES (OLD.${idColumn})
             ON CONFLICT DO NOTHING;
           ELSE
             INSERT INTO ${NEXT}.cutover_changes ("legacyId") VALUES (NEW.${idColumn})
             ON CONFLICT DO NOTHING;
           END IF;
           RETURN NULL;
         END $$`,
      );
      await query(
        `CREATE TRIGGER cutover_record_change
         AFTER INSERT OR UPDATE OR DELETE ON public.${table}
         FOR EACH ROW EXECUTE FUNCTION ${NEXT}.record_${table}_change()`,
      );
    }
  });

  // Batches walk the old battles in createdAt order.
  await query(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS battles_cutover_createdAt_idx
     ON public.battles ("createdAt")`,
  );
  log(`Prepared ${NEXT}. Run "copy" next.`);
};

const copy = async () => {
  let total = 0;
  const started = performance.now();

  for (;;) {
    const copied = await inTransaction(copyNextBatch);

    if (copied === 0) break;
    total += copied;
    log(
      `copied ${total} battles through ${await progress()} in ${Math.round((performance.now() - started) / 1000)} s`,
    );
  }

  // Chunks the copy finished get compressed now, as the policy would have.
  const chunks = await query<{ chunk: string }>(
    `SELECT format('%I.%I', chunk_schema, chunk_name) AS chunk
     FROM timescaledb_information.chunks
     WHERE hypertable_schema = $1 AND hypertable_name IN ('battles', 'battle_warriors')
       AND NOT is_compressed AND range_end < now() - INTERVAL '7 days'`,
    [NEXT],
  );

  for (const { chunk } of chunks) {
    await query(
      `SELECT compress_chunk($1::regclass, if_not_compressed => true)`,
      [chunk],
    );
    log(`compressed ${chunk}`);
  }

  log(`Copy caught up: ${total} battles in this run.`);
};

const status = async () => {
  const [row] = await query<{
    copiedThrough: string | null;
    pendingChanges: string;
    mappedBattles: string;
    newestOldBattle: string | null;
  }>(
    `SELECT
       (SELECT "copiedThrough"::text FROM ${NEXT}.cutover_progress) AS "copiedThrough",
       (SELECT count(*) FROM ${NEXT}.cutover_changes) AS "pendingChanges",
       (SELECT count(*) FROM ${NEXT}.battle_legacy_ids) AS "mappedBattles",
       (SELECT max("createdAt")::text FROM public.battles) AS "newestOldBattle"`,
  );

  log(JSON.stringify(row, null, 2));
};

/** Re-copies every battle the old service changed since the copy saw it. */
const applyChanges = async () => {
  const changed = `SELECT "legacyId" FROM ${NEXT}.cutover_changes`;
  const mapped = `SELECT "battleId" FROM ${NEXT}.battle_legacy_ids WHERE "legacyId" IN (${changed})`;

  for (const table of ["battle_warriors", "battle_submissions"])
    await query(`DELETE FROM ${NEXT}.${table} WHERE "battleId" IN (${mapped})`);
  await query(`DELETE FROM ${NEXT}.battles WHERE id IN (${mapped})`);
  await query(
    `DELETE FROM ${NEXT}.battle_legacy_ids legacy
     WHERE legacy."legacyId" IN (${changed})
       AND NOT EXISTS (SELECT FROM public.battles old WHERE old.id = legacy."legacyId")`,
  );

  const recopied = await copyBattles(
    `SELECT id, "createdAt" FROM public.battles WHERE id IN (${changed})`,
    [],
  );

  await query(`TRUNCATE ${NEXT}.cutover_changes`);

  return recopied;
};

const cutover = async () => {
  const { hash, tail } = await readMigration();

  await inTransaction(async () => {
    await query("SET LOCAL TimeZone = 'UTC'");
    await query(
      "SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction = 0",
    );
    // Reads of the old tables continue; the old service's writes wait here.
    await query(
      "LOCK TABLE public.battles, public.battle_warriors IN EXCLUSIVE MODE",
    );

    let copied = 0;

    for (
      let batch = await copyNextBatch();
      batch > 0;
      batch = await copyNextBatch()
    )
      copied += batch;

    const recopied = await applyChanges();

    for (const table of ["battles", "battle_warriors"])
      await query(`DROP TRIGGER cutover_record_change ON public.${table}`);

    await query(`CREATE SCHEMA ${OLD}`);
    await query(`ALTER TABLE public.battles SET SCHEMA ${OLD}`);
    await query(`ALTER TABLE public.battle_warriors SET SCHEMA ${OLD}`);

    for (const table of MOVED_TABLES)
      await query(`ALTER TABLE ${NEXT}.${table} SET SCHEMA public`);

    await query(`DROP SCHEMA ${NEXT} CASCADE`);

    for (const statement of tail) await query(statement);

    await query(
      `SELECT alter_job(job_id, scheduled => true)
       FROM timescaledb_information.jobs
       WHERE hypertable_schema = 'public' AND proc_name = 'policy_compression'`,
    );
    await query(
      `INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at", "name")
       VALUES ($1, $2, $3)`,
      [hash, migrationMillis(MIGRATION_NAME), MIGRATION_NAME],
    );

    log(
      `Cut over: ${copied} late battles copied, ${recopied} changed battles re-copied. Release the new Battlelog service now.`,
    );
  });
};

// Drizzle records a migration with the UTC timestamp its folder name starts with.
const migrationMillis = (name: string) =>
  Date.UTC(
    Number(name.slice(0, 4)),
    Number(name.slice(4, 6)) - 1,
    Number(name.slice(6, 8)),
    Number(name.slice(8, 10)),
    Number(name.slice(10, 12)),
    Number(name.slice(12, 14)),
  );

const verify = async () => {
  const [counts] = await query<Record<string, string>>(
    `SELECT
       (SELECT count(*) FROM ${OLD}.battles) AS "oldBattles",
       (SELECT count(*) FROM public.battles) AS "battles",
       (SELECT count(*) FROM ${OLD}.battle_warriors) AS "oldWarriors",
       (SELECT count(*) FROM public.battle_warriors) AS "warriors",
       (SELECT count(*) FROM ${OLD}.battles WHERE "submissionId" IS NOT NULL) AS "oldSubmissions",
       (SELECT count(*) FROM public.battle_submissions) AS "submissions",
       (SELECT count(*) FROM public.battle_legacy_ids) AS "legacyIds"`,
  );

  log(JSON.stringify(counts, null, 2));

  // Battles saved after the cutover exist only in the new tables.
  const [missing] = await query<{ missing: string }>(
    `SELECT count(*) AS missing FROM ${OLD}.battles old
     WHERE NOT EXISTS (
       SELECT FROM public.battle_legacy_ids legacy
       JOIN public.battles battle ON battle.id = legacy."battleId"
       WHERE legacy."legacyId" = old.id
     )`,
  );

  log(`old battles without a migrated battle: ${missing?.missing}`);
};

const cleanup = async () => {
  await query(`DROP SCHEMA ${OLD} CASCADE`);

  log(`Dropped ${OLD}.`);
};

const steps = { prepare, copy, status, cutover, verify, cleanup };

const stepName = process.argv[2];

const step =
  stepName && Object.hasOwn(steps, stepName)
    ? // SAFETY: Object.hasOwn checked that the name is one of the steps.
      steps[stepName as keyof typeof steps]
    : undefined;

if (!step) {
  console.error(
    `Usage: battlelog-timescale-cutover.ts <${Object.keys(steps).join("|")}>`,
  );
  process.exit(1);
}

await client.connect();

try {
  await step();
} finally {
  await client.end();
}
