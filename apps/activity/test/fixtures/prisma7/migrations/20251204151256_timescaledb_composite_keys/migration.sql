-- Update schema for TimescaleDB compatibility
-- TimescaleDB requires partitioning column (createdAt) to be part of all unique indexes and primary keys

-- DropIndex
DROP INDEX "Activity_idempotencyKey_key";

-- AlterTable
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_pkey",
ADD CONSTRAINT "Activity_pkey" PRIMARY KEY ("id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_idempotencyKey_createdAt_key" ON "Activity"("idempotencyKey", "createdAt");

-- TimescaleDB activation for Activity log
-- Requires the TimescaleDB extension to be installed (superuser privileges)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert Activity table to a hypertable partitioned by createdAt
SELECT create_hypertable(
  '"Activity"',
  'createdAt',
  chunk_time_interval => INTERVAL '7 days',
  migrate_data => TRUE,
  if_not_exists => TRUE
);

-- Keep only the last 14 days of activity data
SELECT add_retention_policy(
  '"Activity"',
  INTERVAL '14 days',
  if_not_exists => TRUE
);
