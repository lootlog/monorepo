-- Free-text loot search resolves its term against the snapshot tables before
-- scanning an Organization. Matching PlayerSnapshot names is a substring match
-- that the existing btree cannot serve. pg_trgm is a trusted extension, so the
-- database owner can install it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "PlayerSnapshot_name_trgm_idx" ON "PlayerSnapshot" USING gin ("name" gin_trgm_ops);
