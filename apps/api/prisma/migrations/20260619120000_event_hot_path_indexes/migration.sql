CREATE INDEX "EventMap_mapName_idx" ON "EventMap"("mapName");

CREATE INDEX "EventMapCoverageGap_heroNpcId_startedAt_idx" ON "EventMapCoverageGap"("heroNpcId", "startedAt");

CREATE INDEX "EventMapCoverageGap_mapId_startedAt_idx" ON "EventMapCoverageGap"("mapId", "startedAt");

CREATE INDEX "EventPresenceLog_mapId_endedAt_isAfk_memberId_idx" ON "EventPresenceLog"("mapId", "endedAt", "isAfk", "memberId");

CREATE INDEX "EventHeroKill_heroNpcId_killedAt_idx" ON "EventHeroKill"("heroNpcId", "killedAt");
