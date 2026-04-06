import { MIN_NPC_WT, MIN_RESP_BASE_SECONDS } from "@/constants/margonem";
import { SpecialE2 } from "@/constants/special-e2";
import { useCreateTimer } from "@/hooks/api/use-create-timer";
import type { LootlogCharacterConfigResponse } from "@/hooks/api/use-lootlog-character-config";
import { NpcType } from "@/hooks/api/use-npcs";
import { getNpcTypeByWt } from "@lootlog/types";
import { Game } from "@/lib/game";
import { useNotificationsStore } from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { useQueryClient } from "@tanstack/react-query";

export const useNpcsDeleteHandlers = () => {
  const { removeNpc } = useNpcDetectorStore();
  const { mutate: createTimer } = useCreateTimer();
  const { removeNotificationByNpcId } = useNotificationsStore();
  const queryClient = useQueryClient();

  const handleNpcsDelete = (event: GameEvent) => {
    if (!event.npcs_del?.length) return;

    event.npcs_del?.forEach((npc) => {
      const data = Game.getNpc(npc.id);
      const world = Game.getWorldName();
      const characterId = Game.hero.id;
      const accountId = Game.hero.account;

      if (!data || !npc.respBaseSeconds || data.wt < MIN_NPC_WT) return;

      removeNpc(npc.id);
      removeNotificationByNpcId(npc.id, world);

      if (npc.respBaseSeconds < MIN_RESP_BASE_SECONDS) return;

      const map = Game.map.id;
      const elite2Name = SpecialE2[map as keyof typeof SpecialE2] || data.nick;
      const npcType = getNpcTypeByWt(NpcType, data.wt, data.prof, data.type);
      const npcName = npcType === NpcType.ELITE2 ? elite2Name : data.nick;

      const charactersConfigResponse = queryClient.getQueryData<{
        data: LootlogCharacterConfigResponse;
      }>(["lootlog-characters-config", String(accountId)]);

      const charactersConfig = charactersConfigResponse?.data;
      const characterConfig = charactersConfig?.[String(characterId)];
      const whitelistedGuildIds =
        characterConfig?.addTimersWhitelistGuildIds ?? [];

      if (whitelistedGuildIds.length === 0) return;

      createTimer({
        timer: {
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
        },
        guildIds: whitelistedGuildIds,
        npcType,
      });
    });
  };

  return {
    handleNpcsDelete,
  };
};
