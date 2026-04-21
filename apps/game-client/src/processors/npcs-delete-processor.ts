import { MIN_NPC_WT, MIN_RESP_BASE_SECONDS } from "@/constants/margonem";
import { SpecialE2 } from "@/constants/special-e2";
import { NpcType } from "@/hooks/api/use-npcs";
import { getNpcTypeByWt } from "@lootlog/types";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { queryClient } from "@/lib/query-client";
import { createAutoTimer } from "@/api";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import type { LootlogCharacterConfigResponse } from "@/hooks/api/use-lootlog-character-config";

export class NpcsDeleteProcessor {
  handle(event: GameEvent): void {
    if (!event.npcs_del?.length) return;

    event.npcs_del.forEach((npc) => {
      const world = Game.getWorldName();

      useNpcDetectorStore.getState().removeNpc(npc.id);
      useNotificationsStore.getState().removeNotificationByNpcId(npc.id, world);

      const data = Game.getNpc(npc.id);
      const characterId = Game.hero.id;
      const accountId = Game.hero.account;

      if (!data || !npc.respBaseSeconds || data.wt < MIN_NPC_WT) {
        return;
      }

      if (npc.respBaseSeconds < MIN_RESP_BASE_SECONDS) {
        return;
      }

      const map = Game.map.id;
      const elite2Name = SpecialE2[map as keyof typeof SpecialE2] || data.nick;
      const npcType = getNpcTypeByWt(NpcType, data.wt, data.prof, data.type);
      const npcName = npcType === NpcType.ELITE2 ? elite2Name : data.nick;
      const lootlogCharacterConfigQueryKey =
        getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
          accountId: String(accountId),
        });

      const charactersConfig =
        queryClient.getQueryData<LootlogCharacterConfigResponse>(
          lootlogCharacterConfigQueryKey,
        );
      const characterConfig = charactersConfig?.[String(characterId)];
      const catchingGuildIds = characterConfig?.catchingGuildIds ?? [];

      if (catchingGuildIds.length === 0) {
        return;
      }

      createAutoTimer({
        respawnRandomness: data.resp_rand,
        respBaseSeconds: npc.respBaseSeconds,
        characterId: String(characterId),
        accountId: String(accountId),
        world,
        npc: {
          icon: data.icon,
          id: data.id,
          prof: data.prof,
          wt: data.wt,
          hpp: 0,
          type: data.type,
          lvl: data.lvl,
          name: npcName,
          location: Game.map.name,
        },
      }).catch((error) => {
        console.warn("[NpcsDeleteProcessor] Failed to create timer:", error);
      });
    });
  }
}
