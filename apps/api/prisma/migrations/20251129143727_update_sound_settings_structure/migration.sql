-- AlterTable: Add new columns for separate category volumes and configs
ALTER TABLE "UserSoundSettings" ADD COLUMN "notificationsVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "UserSoundSettings" ADD COLUMN "detectorVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "UserSoundSettings" ADD COLUMN "timersVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "UserSoundSettings" ADD COLUMN "notificationsConfig" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "UserSoundSettings" ADD COLUMN "detectorConfig" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "UserSoundSettings" ADD COLUMN "timersConfig" JSONB NOT NULL DEFAULT '{}';

-- Migrate existing npcTypesConfig data to new structure
-- Copy the old config to all three new configs (notifications, detector, timers)
UPDATE "UserSoundSettings" SET
  "notificationsConfig" = "npcTypesConfig",
  "detectorConfig" = "npcTypesConfig",
  "timersConfig" = "npcTypesConfig"
WHERE "npcTypesConfig" IS NOT NULL AND "npcTypesConfig"::text != '{}';

-- Drop old column
ALTER TABLE "UserSoundSettings" DROP COLUMN "npcTypesConfig";
