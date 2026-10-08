-- Plans over the battle hypertables cost more than jit_above_cost, and
-- compiling them adds about 85 ms to analytics reads. A database setting
-- reaches sessions opened through PgBouncer, which rejects a jit startup
-- parameter. It applies to connections opened after the migration.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET jit = off', current_database());
END
$$;
