-- Update TimescaleDB retention policy from 14 days to 7 days
-- Update chunk time interval from 7 days to 1 day

-- Remove existing retention policy (if exists)
SELECT remove_retention_policy('"Activity"', if_exists => TRUE);

-- Add new retention policy for 7 days
SELECT add_retention_policy(
  '"Activity"',
  INTERVAL '7 days',
  if_not_exists => TRUE
);

-- Change chunk time interval to 1 day for future chunks
-- Note: Existing chunks won't be affected, only new chunks will use the new interval
SELECT set_chunk_time_interval('"Activity"', INTERVAL '1 day');
