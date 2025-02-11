/*
  Warnings:

  - A unique constraint covering the columns `[vanityUrl]` on the table `Guild` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Guild_vanityUrl_key" ON "Guild"("vanityUrl");
