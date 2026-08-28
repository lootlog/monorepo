ALTER TABLE "Timer"
ADD COLUMN "timerKey" TEXT;

UPDATE "Timer"
SET "timerKey" = CONCAT(
  "npcId",
  ':',
  LOWER(REGEXP_REPLACE(BTRIM("npc"->>'name'), '\s+', ' ', 'g'))
);

ALTER TABLE "Timer"
ALTER COLUMN "timerKey" SET NOT NULL;

ALTER TABLE "Timer"
DROP CONSTRAINT "Timer_pkey";

ALTER TABLE "Timer"
ADD CONSTRAINT "Timer_pkey" PRIMARY KEY ("guildId", "world", "timerKey");

CREATE INDEX "Timer_guildId_world_timerKey_idx"
ON "Timer"("guildId", "world", "timerKey");
