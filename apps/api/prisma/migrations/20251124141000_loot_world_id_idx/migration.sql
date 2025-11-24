-- Improve paging/filtering by world + id
CREATE INDEX "Loot_world_id_idx" ON "Loot"("world", "id");
