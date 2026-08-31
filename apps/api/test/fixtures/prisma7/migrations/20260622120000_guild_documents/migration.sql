-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'LOOTLOG_DOCS_READ';
ALTER TYPE "Permission" ADD VALUE 'LOOTLOG_DOCS_WRITE';

-- AlterTable
ALTER TABLE "Guild"
ADD COLUMN "documentLimit" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "GuildDocument" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GuildDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildDocumentHistory" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "editedByUserId" TEXT NOT NULL,
  "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GuildDocumentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildDocument_guildId_updatedAt_idx" ON "GuildDocument"("guildId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "GuildDocumentHistory_documentId_version_key" ON "GuildDocumentHistory"("documentId", "version");

-- CreateIndex
CREATE INDEX "GuildDocumentHistory_documentId_editedAt_idx" ON "GuildDocumentHistory"("documentId", "editedAt" DESC);

-- CreateIndex
CREATE INDEX "GuildDocumentHistory_guildId_editedAt_idx" ON "GuildDocumentHistory"("guildId", "editedAt" DESC);

-- AddForeignKey
ALTER TABLE "GuildDocument" ADD CONSTRAINT "GuildDocument_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDocumentHistory" ADD CONSTRAINT "GuildDocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "GuildDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDocumentHistory" ADD CONSTRAINT "GuildDocumentHistory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
