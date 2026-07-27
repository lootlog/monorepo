import { MIN_NPC_WT, MIN_RESP_BASE_SECONDS } from "@/constants/margonem";
import { SpecialE2 } from "@/constants/special-e2";
import { NpcType } from "@/api/npcs.api";
import { getNpcTypeByWt } from "@lootlog/types";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { queryClient } from "@/lib/query-client";
import { createAutoTimer } from "@/api";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@lootlog/api-client/react-query/main/user-lootlog-config";
import type { UserLootlogConfigAccountResponseDtoOutput } from "@lootlog/api-client/models/main/user-lootlog-config-account-response-dto-output";

export class NpcsDeleteProcessor {
  handle(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    if (!event.npcs_del?.length) return;

    const game = ingress?.game;
    const world = game?.world ?? "unknown";
    const npcDetectorStore = useNpcDetectorStore.getState();
    const notificationsStore = useNotificationsStore.getState();
    const deletedNpcs = event.npcs_del.map((deletion) => ({
      data: ingress?.npcsById[deletion.id],
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
      if (!game) return null;

      const accountId = game.hero.accountId;
      const characterId = game.hero.characterId;
      const map = game.map;
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
      if (!data || !deletion.respBaseSeconds || data.weight < MIN_NPC_WT) {
        return;
      }

      if (deletion.respBaseSeconds < MIN_RESP_BASE_SECONDS) {
        return;
      }

      const context = getTimerContext();
      if (!context) return;
      const elite2Name =
        SpecialE2[context.mapId as keyof typeof SpecialE2] || data.name;
      const npcType = getNpcTypeByWt(
        NpcType,
        data.weight,
        data.profession,
        data.type,
      );
      const npcName = npcType === NpcType.ELITE2 ? elite2Name : data.name;

      if (context.catchingGuildIds.length === 0) {
        return;
      }

      createAutoTimer({
        respawnRandomness: data.respawnRandomness,
        respBaseSeconds: deletion.respBaseSeconds,
        characterId: context.characterId,
        accountId: context.accountId,
        world,
        npc: {
          icon: data.icon,
          id: data.id,
          prof: data.profession,
          wt: data.weight,
          hpp: 0,
          type: data.type,
          lvl: data.level,
          name: npcName,
          location: context.mapName,
        },
      }).catch((error) => {
        console.warn("[NpcsDeleteProcessor] Failed to create timer:", error);
      });
    });
  }
}
