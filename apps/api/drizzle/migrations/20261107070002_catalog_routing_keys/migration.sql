-- The catalog service took items and NPCs over from search under its own
-- routing keys. Loot publications still waiting under the old keys go out
-- under the new ones, so no item or NPC observation is lost. Rows an older
-- API writes during the rollout need this statement run by hand once the rollout finishes.
UPDATE "LootPublicationOutbox" SET "payload" = jsonb_set("payload", '{routingKey}', to_jsonb(CASE "payload"->>'routingKey' WHEN 'search.items.index' THEN 'catalog.items.index' ELSE 'catalog.npcs.index' END)) WHERE "payload"->>'routingKey' IN ('search.items.index', 'search.npcs.index');
