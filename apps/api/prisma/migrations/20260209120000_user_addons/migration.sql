-- CreateEnum
CREATE TYPE "AddonLanguage" AS ENUM ('JAVASCRIPT', 'TYPESCRIPT');

-- CreateTable
CREATE TABLE "UserAddon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runtimeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '0.1.0',
    "language" "AddonLanguage" NOT NULL DEFAULT 'TYPESCRIPT',
    "sourceCode" TEXT NOT NULL,
    "compiledCode" TEXT NOT NULL,
    "installed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAddon_userId_runtimeId_key" ON "UserAddon"("userId", "runtimeId");

-- CreateIndex
CREATE INDEX "UserAddon_userId_installed_idx" ON "UserAddon"("userId", "installed");

-- CreateIndex
CREATE INDEX "UserAddon_userId_updatedAt_idx" ON "UserAddon"("userId", "updatedAt");
