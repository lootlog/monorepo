-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "colorMode" TEXT NOT NULL DEFAULT 'dark',
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'default';
