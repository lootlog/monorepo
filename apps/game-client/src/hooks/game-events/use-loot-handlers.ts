import { useCallback } from "react";
import { AxiosResponse } from "axios";
import { Game } from "@/lib/game";
import { getLoot } from "@/utils/game/get-loots";
import {
  getBattleParticipants,
  Npc,
  PartyMember,
} from "@/utils/game/get-battle-participants";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { CreateLootResponse, useCreateLoot } from "@/hooks/api/use-create-loot";
import { LootHandlersConfig } from "./types";
import { useGlobalStore } from "@/store/global.store";
import { useUpdateLoot } from "@/hooks/api/use-update-loot";
import { gameEventsStore } from "@/store/game-store/game-events.store";

export const useLootHandlers = (config: LootHandlersConfig) => {
  const { world, characterId, accountId } = useGlobalStore(
    (state) => state.gameState,
  );
  const { mutate: createLoot } = useCreateLoot();
  const { mutate: updateLoot } = useUpdateLoot();
  const { isValidGameState, isLootDistributionMessage } = config;

  const createLootFromBattle = useCallback(
    (event: GameEvent) => {
      const pendingBattle = gameEventsStore.pendingBattle;

      if (!createLoot || !pendingBattle) return;

      const loots = getLoot(event.item);
      if (!loots.length || !isValidGameState || !event.loot || !event.f) return;

      const { npcs, party } = getBattleParticipants(pendingBattle, event.f.w);

      createLoot(
        {
          world: world!,
          source: event.loot.source.toUpperCase(),
          location: Game.map.name,
          npcs,
          loots,
          players: party,
          accountId: accountId!,
          characterId: characterId!,
        },
        {
          onSuccess: (response: AxiosResponse<CreateLootResponse>) => {
            gameEventsStore.setLatestLootId(response.data.id);
          },
        },
      );
    },
    [isValidGameState, world, accountId, characterId, createLoot],
  );

  const createLootFromDialog = useCallback(
    (event: GameEvent) => {
      if (!createLoot) return;

      const loots = getLoot(event.item);
      if (!loots.length || !isValidGameState || !event.loot) return;

      const npcs: Npc[] =
        event.npcs_del
          ?.map((npc) => Game.getNpc(npc.id))
          .filter(Boolean)
          .map((npcData) => ({
            icon: npcData!.icon,
            id: npcData!.id,
            name: npcData!.nick,
            prof: npcData!.prof,
            hpp: 0,
            type: npcData!.type,
            wt: npcData!.wt,
            lvl: npcData!.lvl,
            location: Game.map.name,
          })) ?? [];

      if (npcs.length === 0) return;

      const hero = Game.hero;
      const players: PartyMember[] = [
        {
          id: hero.id,
          name: hero.nick,
          icon: hero.img,
          prof: hero.prof,
          hpp: Math.floor(
            (hero.warrior_stats.hp / hero.warrior_stats.maxhp) * 100,
          ),
          lvl: hero.lvl,
          accountId: hero.account,
        },
      ];

      createLoot(
        {
          world: world!,
          source: event.loot.source.toUpperCase(),
          location: Game.map.name,
          loots,
          npcs,
          players,
          accountId: accountId!,
          characterId: characterId!,
        },
        {
          onSuccess: (response: AxiosResponse<CreateLootResponse>) => {
            gameEventsStore.setLatestLootId(response.data.id);
          },
        },
      );
    },
    [isValidGameState, world, accountId, characterId, createLoot],
  );

  const handleUpdateLoot = useCallback(
    (event: GameEvent) => {
      const latestLootId = gameEventsStore.latestLootId;

      if (!updateLoot || !isLootDistributionMessage) return;
      if (!isValidGameState || !event.chat || !latestLootId) return;

      const desiredMsg = event.chat.channels?.system?.msg?.find(
        isLootDistributionMessage,
      );
      if (!desiredMsg) return;

      updateLoot(
        { msg: desiredMsg.msg, id: latestLootId },
        {
          onSuccess: () => {
            gameEventsStore.setLatestLootId(null);
          },
        },
      );
    },
    [isValidGameState, isLootDistributionMessage, updateLoot],
  );

  const handleDialogLoot = useCallback(
    (event: GameEvent) => {
      if (!event.item || event.loot?.source !== "dialog") return;

      gameEventsStore.setLatestLootId(null);

      if (event.npcs_del?.length) {
        createLootFromDialog(event);
      } else {
        const talkingNpcId = gameEventsStore.talkingNpcId;
        if (talkingNpcId) {
          const npc = Game.getNpc(+talkingNpcId);
          if (npc) {
            createLootFromDialog({ ...event, npcs_del: [{ id: npc.id }] });
          }
        }
      }
    },
    [createLootFromDialog],
  );

  return {
    createLootFromBattle,
    createLootFromDialog,
    handleUpdateLoot,
    handleDialogLoot,
  };
};
