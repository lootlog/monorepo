-- Align database-owned defaults and relation actions with the Prisma model in
-- a forward migration so the already-applied expand migration stays immutable.
ALTER TABLE "ReservationShare"
ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "ReservationShareInvitation"
ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "ReservationShare"
DROP CONSTRAINT "ReservationShare_firstGuildId_fkey",
DROP CONSTRAINT "ReservationShare_secondGuildId_fkey",
ADD CONSTRAINT "ReservationShare_firstGuildId_fkey"
FOREIGN KEY ("firstGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ReservationShare_secondGuildId_fkey"
FOREIGN KEY ("secondGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReservationShareInvitation"
DROP CONSTRAINT "ReservationShareInvitation_sourceGuildId_fkey",
ADD CONSTRAINT "ReservationShareInvitation_sourceGuildId_fkey"
FOREIGN KEY ("sourceGuildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserPinnedReservationSpot"
DROP CONSTRAINT "UserPinnedReservationSpot_guildId_fkey",
ADD CONSTRAINT "UserPinnedReservationSpot_guildId_fkey"
FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
