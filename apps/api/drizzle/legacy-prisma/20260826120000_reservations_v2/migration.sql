-- Expand the reservation model while keeping every legacy value available for
-- reconciliation. New code does not read or write the legacy columns.
ALTER TABLE "Reservation"
ADD COLUMN "spotId" TEXT,
ADD COLUMN "spotName" TEXT,
ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3),
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "authorDisplayName" TEXT,
ADD COLUMN "authorAvatarUrl" TEXT,
ADD COLUMN "reminderMinutesBefore" INTEGER;

CREATE TABLE "ReservationShare" (
  "id" TEXT NOT NULL,
  "firstGuildId" TEXT NOT NULL,
  "secondGuildId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReservationShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReservationShare_distinct_guilds_check" CHECK ("firstGuildId" < "secondGuildId")
);

CREATE UNIQUE INDEX "ReservationShare_firstGuildId_secondGuildId_key"
ON "ReservationShare"("firstGuildId", "secondGuildId");
CREATE INDEX "ReservationShare_firstGuildId_revokedAt_idx"
ON "ReservationShare"("firstGuildId", "revokedAt");
CREATE INDEX "ReservationShare_secondGuildId_revokedAt_idx"
ON "ReservationShare"("secondGuildId", "revokedAt");

CREATE TABLE "ReservationShareInvitation" (
  "id" TEXT NOT NULL,
  "sourceGuildId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "acceptedByUserId" TEXT,
  "targetGuildId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReservationShareInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationShareInvitation_tokenHash_key"
ON "ReservationShareInvitation"("tokenHash");
CREATE INDEX "ReservationShareInvitation_sourceGuildId_createdAt_idx"
ON "ReservationShareInvitation"("sourceGuildId", "createdAt");
CREATE INDEX "ReservationShareInvitation_targetGuildId_idx"
ON "ReservationShareInvitation"("targetGuildId");
CREATE INDEX "ReservationShareInvitation_expiresAt_idx"
ON "ReservationShareInvitation"("expiresAt");

CREATE TABLE "UserPinnedReservationSpot" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "spotId" TEXT NOT NULL,
  "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserPinnedReservationSpot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPinnedReservationSpot_userId_guildId_spotId_key"
ON "UserPinnedReservationSpot"("userId", "guildId", "spotId");
CREATE INDEX "UserPinnedReservationSpot_userId_guildId_pinnedAt_idx"
ON "UserPinnedReservationSpot"("userId", "guildId", "pinnedAt" DESC);

ALTER TABLE "ReservationShare"
ADD CONSTRAINT "ReservationShare_firstGuildId_fkey"
FOREIGN KEY ("firstGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ReservationShare_secondGuildId_fkey"
FOREIGN KEY ("secondGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReservationShareInvitation"
ADD CONSTRAINT "ReservationShareInvitation_sourceGuildId_fkey"
FOREIGN KEY ("sourceGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ReservationShareInvitation_targetGuildId_fkey"
FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserPinnedReservationSpot"
ADD CONSTRAINT "UserPinnedReservationSpot_guildId_fkey"
FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
