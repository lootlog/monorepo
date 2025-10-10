-- AlterTable - Add statistics column to battles
ALTER TABLE "battles" ADD COLUMN "statistics" JSONB NOT NULL DEFAULT '{}'::jsonb;
