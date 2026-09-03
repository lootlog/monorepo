-- Cast accountId/characterId to integers to store numeric identifiers
ALTER TABLE "PlayerSnapshot"
  ALTER COLUMN "accountId" TYPE INTEGER USING ("accountId"::integer),
  ALTER COLUMN "characterId" TYPE INTEGER USING ("characterId"::integer);
