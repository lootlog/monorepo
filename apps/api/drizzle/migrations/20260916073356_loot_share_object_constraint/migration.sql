-- The 20250711064749 migration added this column with DEFAULT '[]'.
-- 20250711101817 changed the default to '{}' without repairing existing rows.
UPDATE "Loot"
SET "lootShare" = '{}'::jsonb
WHERE "lootShare" = '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "Loot" ADD CONSTRAINT "Loot_lootShare_object_check"
CHECK (jsonb_typeof("lootShare") = 'object');
