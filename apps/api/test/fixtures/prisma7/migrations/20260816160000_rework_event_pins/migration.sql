DELETE FROM "UserSettingDocument"
WHERE "domain" = 'events';

DROP TABLE IF EXISTS "UserGuildEventSettings";

CREATE TABLE "UserPinnedEvent" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPinnedEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPinnedEvent_userId_eventId_key"
ON "UserPinnedEvent"("userId", "eventId");

CREATE INDEX "UserPinnedEvent_userId_pinnedAt_idx"
ON "UserPinnedEvent"("userId", "pinnedAt" DESC);

CREATE INDEX "UserPinnedEvent_eventId_idx"
ON "UserPinnedEvent"("eventId");

ALTER TABLE "UserPinnedEvent"
ADD CONSTRAINT "UserPinnedEvent_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
