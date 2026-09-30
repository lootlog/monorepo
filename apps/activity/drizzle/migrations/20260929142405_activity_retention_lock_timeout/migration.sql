-- Dropping a chunk also dropped this key's triggers on "ActivityActorSnapshot",
-- taking ACCESS EXCLUSIVE on the table every activity write reads. Snapshots are
-- never deleted and activity reads left-join them. Fail instead of queuing writers
-- behind a busy table; retry when traffic allows.
SET LOCAL lock_timeout = '2s';--> statement-breakpoint
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_actorSnapshotId_fkey";--> statement-breakpoint
SET LOCAL lock_timeout = DEFAULT;--> statement-breakpoint
-- A drop waiting on a long reader queues every later query on the expired chunk
-- behind it. Give up after a second and retry on the next hourly run instead.
CREATE PROCEDURE activity_retention(job_id integer, config jsonb)
LANGUAGE plpgsql
SET lock_timeout = '1s'
AS $$
BEGIN
  PERFORM drop_chunks('"Activity"', older_than => (config->>'drop_after')::interval);
END
$$;--> statement-breakpoint
SELECT remove_retention_policy('"Activity"', if_exists => TRUE);--> statement-breakpoint
SELECT add_job('activity_retention', '1 hour', config => '{"drop_after": "7 days"}');
