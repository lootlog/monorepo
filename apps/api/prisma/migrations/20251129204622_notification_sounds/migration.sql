-- CreateTable
CREATE TABLE "UserSoundSettings" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "masterVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notificationsVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "detectorVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "timersVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notificationsConfig" JSONB NOT NULL DEFAULT '{}',
    "detectorConfig" JSONB NOT NULL DEFAULT '{}',
    "timersConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSoundSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSoundSettings_userId_key" ON "UserSoundSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSoundSettings_userId_idx" ON "UserSoundSettings"("userId");
