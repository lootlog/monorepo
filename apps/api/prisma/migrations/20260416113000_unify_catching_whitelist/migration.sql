ALTER TABLE "UserCharactersLootlogSettings"
ADD COLUMN "catchingGuildIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "UserCharactersLootlogSettings"
SET "catchingGuildIds" = ARRAY(
  SELECT DISTINCT guild_id
  FROM unnest(
    COALESCE("collectLootWhitelistGuildIds", ARRAY[]::TEXT[]) ||
    COALESCE("addTimersWhitelistGuildIds", ARRAY[]::TEXT[])
  ) AS guild_id
);

ALTER TABLE "UserCharactersLootlogSettings"
DROP COLUMN "collectLootWhitelistGuildIds",
DROP COLUMN "addTimersWhitelistGuildIds";
