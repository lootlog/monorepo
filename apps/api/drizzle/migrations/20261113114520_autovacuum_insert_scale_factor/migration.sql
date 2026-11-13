-- Loot tables only receive inserts. The default insert threshold (20% of rows)
-- means "Loot" would need ~2.5M new rows before autovacuum runs, so the
-- visibility map stays stale and index-only scans still visit the heap.
ALTER TABLE "Loot" SET (autovacuum_vacuum_insert_scale_factor = 0.01);--> statement-breakpoint
ALTER TABLE "LootItem" SET (autovacuum_vacuum_insert_scale_factor = 0.01);--> statement-breakpoint
ALTER TABLE "LootNpc" SET (autovacuum_vacuum_insert_scale_factor = 0.01);--> statement-breakpoint
ALTER TABLE "LootPlayer" SET (autovacuum_vacuum_insert_scale_factor = 0.01);
