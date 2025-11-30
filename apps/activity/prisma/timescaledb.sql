-- TimescaleDB setup for Activity Logger
-- Run this after initial migration to enable TimescaleDB features

-- 1. Enable TimescaleDB extension (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert Activity table to hypertable
-- This partitions data by time for better performance
SELECT create_hypertable(
  '"Activity"',
  'createdAt',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- 3. Set retention policy - automatically drop data older than 14 days
SELECT add_retention_policy('"Activity"', INTERVAL '14 days');

-- 4. Set compression policy (optional - compress data older than 7 days)
-- ALTER TABLE "Activity" SET (
--   timescaledb.compress,
--   timescaledb.compress_segmentby = 'guildId,type'
-- );

-- SELECT add_compression_policy('"Activity"', INTERVAL '7 days');

-- 5. Create continuous aggregates for common queries (optional)
-- CREATE MATERIALIZED VIEW activity_hourly
-- WITH (timescaledb.continuous) AS
-- SELECT
--   time_bucket('1 hour', "createdAt") AS bucket,
--   "guildId",
--   "type",
--   COUNT(*) as count
-- FROM "Activity"
-- GROUP BY bucket, "guildId", "type";

-- SELECT add_continuous_aggregate_policy('activity_hourly',
--   start_offset => INTERVAL '3 hours',
--   end_offset => INTERVAL '1 hour',
--   schedule_interval => INTERVAL '1 hour');
