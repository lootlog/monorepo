import pg from "pg";
import { Config, Effect, Redacted } from "effect";
import { BATTLE_WARRIOR_STATS_KEYS } from "../src/battles/battle-warrior-stats.types.js";

const scriptConfig = await Effect.runPromise(
  Config.all({
    databaseUrl: Config.redacted("POSTGRESQL_CONNECTION_URI"),
    batchSize: Config.string("BATTLE_WARRIOR_STATS_BACKFILL_BATCH_SIZE").pipe(
      Config.withDefault("1000"),
    ),
  }),
);
const databaseUrl = Redacted.value(scriptConfig.databaseUrl);

function getBatchSize(): number {
  const batchSizeArgIndex = process.argv.indexOf("--batch-size");
  const batchSizeArg =
    batchSizeArgIndex >= 0 ? process.argv[batchSizeArgIndex + 1] : undefined;
  const rawBatchSize = batchSizeArg ?? scriptConfig.batchSize;
  const parsedBatchSize = Number.parseInt(rawBatchSize, 10);

  return Number.isFinite(parsedBatchSize) && parsedBatchSize > 0
    ? parsedBatchSize
    : 1000;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const requiredKeysSql = `ARRAY[${BATTLE_WARRIOR_STATS_KEYS.map(quoteLiteral).join(", ")}]`;
const jsonbBuildObjectPairLimit = 40;
const statsJsonSql = BATTLE_WARRIOR_STATS_KEYS.reduce<string[][]>(
  (chunks, key) => {
    const lastChunk = chunks.at(-1);

    if (!lastChunk || lastChunk.length >= jsonbBuildObjectPairLimit) {
      chunks.push([key]);
      return chunks;
    }

    lastChunk.push(key);
    return chunks;
  },
  [],
)
  .map(
    (keys) =>
      `jsonb_build_object(${keys
        .map((key) => `${quoteLiteral(key)}, ${quoteIdentifier(key)}`)
        .join(", ")})`,
  )
  .join(" || ");
const sampleKeys = [
  "turns",
  "damageDealt",
  "damageTaken",
  "blockedDamage",
  "spellsUsedMap",
  "isDead",
];
const sampleLegacyChecksumSql = `md5(concat_ws('|', ${sampleKeys
  .map((key) => `${quoteIdentifier(key)}::text`)
  .join(", ")}))`;
const sampleStatsChecksumSql = `md5(concat_ws('|', ${sampleKeys
  .map((key) => `(stats->${quoteLiteral(key)})::text`)
  .join(", ")}))`;

async function assertColumnsExist(pool: pg.Pool): Promise<void> {
  const result = await pool.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'battle_warriors'
      AND column_name IN ('stats', 'statsVersion')
  `);
  const columns = new Set(result.rows.map((row) => row.column_name));

  if (!columns.has("stats") || !columns.has("statsVersion")) {
    throw new Error(
      "battle_warriors.stats and battle_warriors.statsVersion are required. Run the Release A migration first.",
    );
  }
}

async function countRows(pool: pg.Pool): Promise<{
  totalRows: number;
  remainingIncompleteRows: number;
}> {
  const result = await pool.query<{
    total_rows: string;
    remaining_incomplete_rows: string;
  }>(`
    SELECT
      count(*)::text AS total_rows,
      count(*) FILTER (WHERE NOT (stats ?& ${requiredKeysSql}))::text
        AS remaining_incomplete_rows
    FROM battle_warriors
  `);
  const [row] = result.rows;

  return {
    totalRows: Number.parseInt(row?.total_rows ?? "0", 10),
    remainingIncompleteRows: Number.parseInt(
      row?.remaining_incomplete_rows ?? "0",
      10,
    ),
  };
}

async function backfillBatch(
  pool: pg.Pool,
  batchSize: number,
): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `
      WITH batch AS (
        SELECT id
        FROM battle_warriors
        WHERE NOT (stats ?& ${requiredKeysSql})
        ORDER BY id
        LIMIT $1
      )
      UPDATE battle_warriors AS warrior
      SET
        stats = ${statsJsonSql} || warrior.stats,
        "statsVersion" = GREATEST(warrior."statsVersion", 1)
      FROM batch
      WHERE warrior.id = batch.id
      RETURNING warrior.id
    `,
    [batchSize],
  );

  return result.rowCount ?? 0;
}

async function getSampleComparisons(pool: pg.Pool) {
  const result = await pool.query<{
    id: string;
    legacy_checksum: string;
    stats_checksum: string;
    checksums_match: boolean;
  }>(`
    SELECT
      id,
      ${sampleLegacyChecksumSql} AS legacy_checksum,
      ${sampleStatsChecksumSql} AS stats_checksum,
      ${sampleLegacyChecksumSql} = ${sampleStatsChecksumSql} AS checksums_match
    FROM battle_warriors
    ORDER BY id
    LIMIT 5
  `);

  return result.rows;
}

async function main(): Promise<void> {
  const batchSize = getBatchSize();
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    await assertColumnsExist(pool);
    const before = await countRows(pool);
    let updatedRows = 0;

    while (true) {
      const updatedInBatch = await backfillBatch(pool, batchSize);
      updatedRows += updatedInBatch;

      if (updatedInBatch === 0) {
        break;
      }
    }

    const after = await countRows(pool);
    const sampleComparisons = await getSampleComparisons(pool);

    console.log(
      JSON.stringify(
        {
          batchSize,
          totalRows: before.totalRows,
          initiallyIncompleteRows: before.remainingIncompleteRows,
          updatedRows,
          remainingIncompleteRows: after.remainingIncompleteRows,
          sampleComparisons,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
