-- Live tables require a concurrent prebuild outside Drizzle's transaction.
-- Empty databases can create these indexes normally during bootstrap.
DO $$
DECLARE
  expected record;
  index_oid regclass;
  table_oid regclass;
  table_schema text;
  has_rows boolean;
BEGIN
  FOR expected IN
    SELECT * FROM (VALUES
      ('battle_warriors', 'battle_warriors_battleId_name_id_idx', '"battleId", name, id DESC NULLS LAST'),
      ('battles', 'battles_userId_id_idx', '"userId", id')
    ) AS indexes(table_name, index_name, columns)
  LOOP
    table_oid := to_regclass(expected.table_name);
    SELECT namespace.nspname INTO table_schema
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE relation.oid = table_oid;
    index_oid := to_regclass(format('%I.%I', table_schema, expected.index_name));

    IF index_oid IS NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s LIMIT 1)', table_oid)
        INTO has_rows;
      IF has_rows THEN
        RAISE EXCEPTION 'Prebuild index % CONCURRENTLY before migrating populated table %',
          expected.index_name, expected.table_name;
      END IF;
    ELSIF NOT EXISTS (
      SELECT 1 FROM pg_index
      WHERE indexrelid = index_oid AND indrelid = table_oid AND indisvalid
        AND pg_get_indexdef(indexrelid) = format(
          'CREATE INDEX %I ON %I.%I USING btree (%s)',
          expected.index_name, table_schema, expected.table_name, expected.columns
        )
    ) THEN
      RAISE EXCEPTION 'Index % is invalid or has an unexpected definition',
        expected.index_name;
    END IF;
  END LOOP;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "battle_warriors_battleId_name_id_idx" ON "battle_warriors" ("battleId","name","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "battles_userId_id_idx" ON "battles" ("userId","id");
