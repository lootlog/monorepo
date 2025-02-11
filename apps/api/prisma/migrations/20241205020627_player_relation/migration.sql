-- AddForeignKey
ALTER TABLE "PlayerLootlogConfig" ADD CONSTRAINT "PlayerLootlogConfig_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
