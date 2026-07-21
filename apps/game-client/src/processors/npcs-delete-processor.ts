import { MIN_NPC_WT, MIN_RESP_BASE_SECONDS } from "@/constants/margonem";
import { SpecialE2 } from "@/constants/special-e2";
import { NpcType } from "@/api/npcs.api";
import { getNpcTypeByWt } from "@lootlog/types";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { queryClient } from "@/lib/query-client";
import { createAutoTimer } from "@/api";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import type { UserLootlogConfigAccountResponseDtoOutput } from "@/lib/api/generated/main/model";

export class NpcsDeleteProcessor {
  handle(event: GameEvent): void {
    if (!event.npcs_del?.length) return;

    const world = Game.getWorldName();
    const npcDetectorStore = useNpcDetectorStore.getState();
    const notificationsStore = useNotificationsStore.getState();
    const deletedNpcs = event.npcs_del.map((deletion) => ({
      data: Game.getNpc(deletion.id),
      deletion,
    }));
    const deletedNpcIds = event.npcs_del.map((deletion) => deletion.id);
    npcDetectorStore.removeNpc(deletedNpcIds);
    notificationsStore.removeNotificationsByNpcIds(deletedNpcIds, world);
    let timerContext: {
      accountId: string;
      characterId: string;
      catchingGuildIds: string[];
      mapId: number | string;
      mapName: string;
    } | null = null;

    const getTimerContext = () => {
      if (timerContext) return timerContext;

      const hero = Game.hero;
      const accountId = String(hero.account);
      const characterId = String(hero.id);
      const map = Game.map;
      const lootlogCharacterConfigQueryKey =
        getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
          accountId,
        });
      const charactersConfig =
        queryClient.getQueryData<UserLootlogConfigAccountResponseDtoOutput>(
          lootlogCharacterConfigQueryKey,
        );
      const characterConfig = charactersConfig?.[characterId];

      timerContext = {
        accountId,
        characterId,
        catchingGuildIds: characterConfig?.catchingGuildIds ?? [],
        mapId: map.id,
        mapName: map.name,
      };

      return timerContext;
    };

    deletedNpcs.forEach(({ data, deletion }) => {
      if (!data || !deletion.respBaseSeconds || data.wt < MIN_NPC_WT) {
        return;
      }

      if (deletion.respBaseSeconds < MIN_RESP_BASE_SECONDS) {
        return;
      }

      const context = getTimerContext();
      const elite2Name =
        SpecialE2[context.mapId as keyof typeof SpecialE2] || data.nick;
      const npcType = getNpcTypeByWt(NpcType, data.wt, data.prof, data.type);
      const npcName = npcType === NpcType.ELITE2 ? elite2Name : data.nick;

      if (context.catchingGuildIds.length === 0) {
        return;
      }

      createAutoTimer({
        respawnRandomness: data.resp_rand,
        respBaseSeconds: deletion.respBaseSeconds,
        characterId: context.characterId,
        accountId: context.accountId,
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
          location: context.mapName,
        },
      }).catch((error) => {
        console.warn("[NpcsDeleteProcessor] Failed to create timer:", error);
      });
    });
  }
}
