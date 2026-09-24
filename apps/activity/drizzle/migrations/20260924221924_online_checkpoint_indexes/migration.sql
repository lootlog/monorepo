-- Fail instead of queuing checkpoint writers behind a busy table. The migrator
-- rolls back both drops and the journal entry together; retry when traffic allows.
SET LOCAL lock_timeout = '2s';--> statement-breakpoint
DROP INDEX "UserOnlineInterval_userId_endedAt_idx";--> statement-breakpoint
DROP INDEX "UserOnlineInterval_endedAt_idx";--> statement-breakpoint
SET LOCAL lock_timeout = DEFAULT;
