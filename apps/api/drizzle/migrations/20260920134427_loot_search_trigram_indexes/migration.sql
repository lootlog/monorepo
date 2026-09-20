-- Free-text loot search resolves its term before scanning an Organization.
-- Both questions it asks are substring matches that no existing index serves:
-- whether any loot location can match, and which PlayerSnapshot names match.
-- pg_trgm is a trusted extension, so the database owner can install it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "Loot_location_trgm_idx" ON "Loot" USING gin ("location" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "PlayerSnapshot_name_trgm_idx" ON "PlayerSnapshot" USING gin ("name" gin_trgm_ops);
