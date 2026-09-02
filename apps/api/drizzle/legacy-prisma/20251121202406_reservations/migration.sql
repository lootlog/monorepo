-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_guildId_reservationId_idx" ON "Reservation"("guildId", "reservationId");

-- CreateIndex
CREATE INDEX "Reservation_guildId_toDate_idx" ON "Reservation"("guildId", "toDate");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
