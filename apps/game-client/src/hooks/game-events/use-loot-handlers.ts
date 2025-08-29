import { useCallback } from "react";
import { Game } from "@/lib/game";
import { getLoot } from "@/utils/game/get-loots";
import { getBattleParticipants } from "@/utils/game/get-battle-participants";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { LootHandlersConfig } from "./types";

export const useLootHandlers = (config: LootHandlersConfig) => {
  const {
    isValidGameState,
    world,
    accountId,
    characterId,
    createLoot,
    updateLoot,
    pendingBattle,
    talkingNpcId,
    latestLootId,
    isLootDistributionMessage,
  } = config;
  const createLootFromBattle = useCallback(
    (event: GameEvent) => {
      if (!createLoot || !pendingBattle || !latestLootId || !pendingBattle.current) return;

      const loots = getLoot(event.item);
      if (!loots.length || !isValidGameState || !event.loot || !event.f) return;

      const { npcs, party } = getBattleParticipants(
        pendingBattle.current,
        event.f.w
      );

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
          onSuccess: (response: any) => {
            latestLootId.current = response.data.id;
          },
        }
      );
    },
    [
      isValidGameState,
      world,
      accountId,
      characterId,
      createLoot,
      pendingBattle,
      latestLootId,
    ]
  );

  const createLootFromDialog = useCallback(
    (event: GameEvent) => {
      if (!createLoot || !latestLootId) return;

      const loots = getLoot(event.item);
      if (!loots.length || !isValidGameState || !event.loot) return;

      const npcs =
        event.npcs_del
          ?.map((npc) => Game.getNpc(npc.id))
          .filter(Boolean)
          .map((npcData) => ({
            icon: npcData!.icon,
            id: npcData!.id,
            prof: npcData!.prof,
            hpp: 0,
            type: npcData!.type,
            wt: npcData!.wt,
            lvl: npcData!.lvl,
            name: npcData!.nick,
            location: Game.map.name,
          })) ?? [];

      if (npcs.length === 0) return;

      const hero = Game.hero;
      const players = [
        {
          id: hero.id,
          name: hero.nick,
          icon: hero.img,
          prof: hero.prof,
          hpp: Math.floor(
            (hero.warrior_stats.hp / hero.warrior_stats.maxhp) * 100
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
          onSuccess: (response: any) => {
            latestLootId.current = response.data.id;
          },
        }
      );
    },
    [isValidGameState, world, accountId, characterId, createLoot, latestLootId]
  );

  const handleUpdateLoot = useCallback(
    (event: GameEvent) => {
      if (!updateLoot || !isLootDistributionMessage || !latestLootId) return;
      if (!isValidGameState || !event.chat || !latestLootId.current) return;

      const desiredMsg = event.chat.channels?.system?.msg?.find(
        isLootDistributionMessage
      );
      if (!desiredMsg) return;

      updateLoot(
        { msg: desiredMsg.msg, id: latestLootId.current },
        {
          onSuccess: () => {
            console.log("Loot updated successfully");
            latestLootId.current = null;
          },
        }
      );
    },
    [isValidGameState, isLootDistributionMessage, updateLoot, latestLootId]
  );

  const handleDialogLoot = useCallback(
    (event: GameEvent) => {
      if (
        !event.item ||
        event.loot?.source !== "dialog" ||
        !latestLootId ||
        !talkingNpcId
      )
        return;

      latestLootId.current = null;

      if (event.npcs_del?.length) {
        createLootFromDialog(event);
      } else if (talkingNpcId.current) {
        const npc = Game.getNpc(+talkingNpcId.current);
        if (npc) {
          createLootFromDialog({ ...event, npcs_del: [{ id: npc.id }] });
        }
      }
    },
    [createLootFromDialog, latestLootId, talkingNpcId]
  );

  return {
    createLootFromBattle,
    createLootFromDialog,
    handleUpdateLoot,
    handleDialogLoot,
  };
};
