-- Add B-tree index on npc->>'name' for efficient ILIKE searches
CREATE INDEX IF NOT EXISTS "idx_timer_npc_name" ON "Timer" USING btree ((npc->>'name'));