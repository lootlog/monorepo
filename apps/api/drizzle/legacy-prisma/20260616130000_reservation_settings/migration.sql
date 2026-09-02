ALTER TABLE "Guild"
ADD COLUMN "reservationMaxDurationMinutes" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN "reservationMinDurationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "reservationTimeGranularityMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "reservationMaxAdvanceDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "reservationActiveLimitPerSpot" INTEGER NOT NULL DEFAULT 3;
