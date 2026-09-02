import { PgClient } from "@effect/sql-pg";
import { createHash } from "node:crypto";
import { Effect, Schema } from "effect";

export const acceptedActivitySchemaShape = {
  columns: [
    "Activity:id=text,NO,;userId=text,NO,;guildId=text,NO,;discordId=text,NO,;type=ActivityType,NO,;createdAt=timestamptz,NO,CURRENT_TIMESTAMP;source=ActivitySource,NO,;details=jsonb,YES,;actorSnapshotId=text,YES,;world=text,YES,;idempotencyKey=text,NO,",
    "ActivityActorSnapshot:id=text,NO,;accountId=int4,NO,;characterId=int4,NO,;clanName=text,YES,;icon=text,NO,;lvl=int4,NO,;source=ActivitySource,NO,;fingerprint=text,NO,;createdAt=timestamptz,NO,CURRENT_TIMESTAMP;clanId=int4,YES,;name=text,NO,;prof=text,NO,",
    "MemberActivitySession:guildId=text,NO,;discordId=text,NO,;source=ActivitySource,NO,;sessionId=text,NO,;userId=text,YES,;userAgent=text,YES,;world=text,YES,;connectedAt=timestamptz,NO,CURRENT_TIMESTAMP;lastSeenAt=timestamptz,NO,CURRENT_TIMESTAMP",
    "MemberActivityStats:guildId=text,NO,;discordId=text,NO,;source=ActivitySource,NO,;lastSeenAt=timestamptz,YES,;visitCount=int4,NO,0;activeSessionCount=int4,NO,0;createdAt=timestamptz,NO,CURRENT_TIMESTAMP;updatedAt=timestamptz,NO,",
  ],
  constraints: [
    "ActivityActorSnapshot_pkey:PRIMARY KEY (id)",
    'Activity_actorSnapshotId_fkey:FOREIGN KEY ("actorSnapshotId") REFERENCES "ActivityActorSnapshot"(id) ON UPDATE CASCADE ON DELETE SET NULL',
    'Activity_pkey:PRIMARY KEY (id, "createdAt")',
    'MemberActivitySession_pkey:PRIMARY KEY ("guildId", "discordId", source, "sessionId")',
    'MemberActivityStats_pkey:PRIMARY KEY ("guildId", "discordId", source)',
  ],
  enums: [
    "ActivitySource:GAME,WEB_APP",
    "ActivityType:CONNECT_EVENT,DISCONNECT_EVENT",
  ],
  indexes: [
    'ActivityActorSnapshot_fingerprint_key:CREATE UNIQUE INDEX "ActivityActorSnapshot_fingerprint_key" ON "ActivityActorSnapshot" USING btree (fingerprint)',
    'ActivityActorSnapshot_pkey:CREATE UNIQUE INDEX "ActivityActorSnapshot_pkey" ON "ActivityActorSnapshot" USING btree (id)',
    'Activity_createdAt_guildId_idx:CREATE INDEX "Activity_createdAt_guildId_idx" ON "Activity" USING btree ("createdAt" DESC, "guildId")',
    'Activity_createdAt_type_idx:CREATE INDEX "Activity_createdAt_type_idx" ON "Activity" USING btree ("createdAt" DESC, type)',
    'Activity_createdAt_userId_idx:CREATE INDEX "Activity_createdAt_userId_idx" ON "Activity" USING btree ("createdAt" DESC, "userId")',
    'Activity_guildId_createdAt_idx:CREATE INDEX "Activity_guildId_createdAt_idx" ON "Activity" USING btree ("guildId", "createdAt" DESC)',
    'Activity_idempotencyKey_createdAt_key:CREATE UNIQUE INDEX "Activity_idempotencyKey_createdAt_key" ON "Activity" USING btree ("idempotencyKey", "createdAt")',
    'Activity_pkey:CREATE UNIQUE INDEX "Activity_pkey" ON "Activity" USING btree (id, "createdAt")',
    'MemberActivitySession_guildId_discordId_source_idx:CREATE INDEX "MemberActivitySession_guildId_discordId_source_idx" ON "MemberActivitySession" USING btree ("guildId", "discordId", source)',
    'MemberActivitySession_guildId_source_idx:CREATE INDEX "MemberActivitySession_guildId_source_idx" ON "MemberActivitySession" USING btree ("guildId", source)',
    'MemberActivitySession_lastSeenAt_idx:CREATE INDEX "MemberActivitySession_lastSeenAt_idx" ON "MemberActivitySession" USING btree ("lastSeenAt")',
    'MemberActivitySession_pkey:CREATE UNIQUE INDEX "MemberActivitySession_pkey" ON "MemberActivitySession" USING btree ("guildId", "discordId", source, "sessionId")',
    'MemberActivityStats_guildId_source_idx:CREATE INDEX "MemberActivityStats_guildId_source_idx" ON "MemberActivityStats" USING btree ("guildId", source)',
    'MemberActivityStats_pkey:CREATE UNIQUE INDEX "MemberActivityStats_pkey" ON "MemberActivityStats" USING btree ("guildId", "discordId", source)',
  ],
  timescale: { chunkInterval: "1 day", hypertable: true, retention: "7 days" },
} as const;

const stableJson = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.keys(entry)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            result[key] = entry[key];
            return result;
          }, {})
      : entry,
  );
export const ACTIVITY_SCHEMA_FINGERPRINT = createHash("sha256")
  .update(stableJson(acceptedActivitySchemaShape))
  .digest("hex");
export const isAcceptedActivitySchema = (shape: unknown): boolean =>
  stableJson(shape) === stableJson(acceptedActivitySchemaShape);

export class DatabaseAdoptionError extends Schema.TaggedError<DatabaseAdoptionError>()(
  "DatabaseAdoptionError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}

export const loadActivitySchemaShape = Effect.fn("ActivityDatabase.loadShape")(
  function* () {
    const sql = yield* PgClient.PgClient;
    const columns = yield* sql.unsafe<{ signature: string }>(
      `SELECT table_name || ':' || string_agg(column_name || '=' || udt_name || ',' || is_nullable || ',' || coalesce(column_default,''), ';' ORDER BY ordinal_position) AS signature FROM information_schema.columns WHERE table_schema=current_schema() AND table_name IN ('Activity','ActivityActorSnapshot','MemberActivitySession','MemberActivityStats') GROUP BY table_name ORDER BY table_name`,
    );
    const constraints = yield* sql.unsafe<{ signature: string }>(
      `SELECT conname || ':' || pg_get_constraintdef(oid, true) AS signature FROM pg_constraint WHERE connamespace=current_schema()::regnamespace AND conrelid::regclass::text IN ('"Activity"','"ActivityActorSnapshot"','"MemberActivitySession"','"MemberActivityStats"') ORDER BY conname`,
    );
    const enums = yield* sql.unsafe<{ signature: string }>(
      `SELECT t.typname || ':' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS signature FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname IN ('ActivitySource','ActivityType') GROUP BY t.typname ORDER BY t.typname`,
    );
    const indexes = yield* sql.unsafe<{ signature: string }>(
      `SELECT indexname || ':' || replace(indexdef, ' ON '||quote_ident(current_schema())||'.', ' ON ') AS signature FROM pg_indexes WHERE schemaname=current_schema() AND tablename IN ('Activity','ActivityActorSnapshot','MemberActivitySession','MemberActivityStats') ORDER BY indexname`,
    );
    const timescale = yield* sql.unsafe<{
      hypertable: boolean;
      chunkInterval: string | null;
      retention: string | null;
    }>(
      `SELECT EXISTS(SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_schema=current_schema() AND hypertable_name='Activity') AS hypertable, (SELECT time_interval::text FROM timescaledb_information.dimensions WHERE hypertable_schema=current_schema() AND hypertable_name='Activity' LIMIT 1) AS "chunkInterval", (SELECT config->>'drop_after' FROM timescaledb_information.jobs WHERE hypertable_schema=current_schema() AND hypertable_name='Activity' AND proc_name='policy_retention' LIMIT 1) AS retention`,
    );
    return {
      columns: columns.map((row) => row.signature),
      constraints: constraints.map((row) => row.signature),
      enums: enums.map((row) => row.signature),
      indexes: indexes.map((row) => row.signature),
      timescale: timescale[0],
    };
  },
);

export const verifyAndAdoptDatabase = Effect.fn(
  "ActivityDatabase.verifyAndAdopt",
)(function* () {
  const sql = yield* PgClient.PgClient;
  const shape = yield* loadActivitySchemaShape();
  if (!isAcceptedActivitySchema(shape))
    return yield* new DatabaseAdoptionError({
      message:
        "Activity database fingerprint does not match the accepted legacy schema",
    });
  yield* sql.unsafe(
    `CREATE TABLE IF NOT EXISTS "__lootlog_drizzle_adoption" ("component" TEXT PRIMARY KEY, "fingerprint" TEXT NOT NULL, "adoptedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  );
  const marker = yield* sql.unsafe<{ fingerprint: string }>(
    `SELECT fingerprint FROM "__lootlog_drizzle_adoption" WHERE component='activity'`,
  );
  if (
    marker.length > 0 &&
    marker[0]?.fingerprint !== ACTIVITY_SCHEMA_FINGERPRINT
  )
    return yield* new DatabaseAdoptionError({
      message: "Activity database adoption marker has an unknown fingerprint",
    });
  if (marker.length === 0)
    yield* sql.unsafe(
      `INSERT INTO "__lootlog_drizzle_adoption" (component, fingerprint) VALUES ('activity', $1)`,
      [ACTIVITY_SCHEMA_FINGERPRINT],
    );
});
