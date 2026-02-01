import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { useCreateBattle } from "@/hooks/api/use-create-battle";
import { useCreateKill } from "@/hooks/api/use-create-kill";
import { NpcType } from "@/hooks/api/use-npcs";
import { addAccountIdsToWarriors } from "@/hooks/game-events/helpers/battle.helpers";
import { Game } from "@/lib/game";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import {
  useBattleStore,
  type BattleWarriorsWithAccountId,
} from "@/store/game-store/battle.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";

const TRACKABLE_NPC_TYPES = new Set([
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
]);

const extractDeadNpcs = (warriors: BattleWarriorsWithAccountId) => {
  const deadNpcs: Array<{
    id: number;
    name: string;
    lvl: number;
    prof: string;
    icon: string;
    wt: number;
    type: number;
  }> = [];

  for (const [key, warrior] of Object.entries(warriors)) {
    if (key.startsWith("-") && warrior.hpp === 0) {
      deadNpcs.push({
        id: Number.parseInt(key, 10),
        name: warrior.name,
        lvl: warrior.lvl,
        prof: warrior.prof || "",
        icon: warrior.icon,
        wt: warrior.wt,
        type: warrior.type,
      });
    }
  }

  return deadNpcs;
};

export const useBattleEventHandler = () => {
  const { mutate: createBattle } = useCreateBattle();
  const { mutate: createKill } = useCreateKill();

  const handleBattleEvents = async (event: GameEvent) => {
    if (!event.f) return;

    const accountId = Game.hero.account;
    const characterId = Game.hero.id;
    const world = Game.getWorldName();

    const battlePanelStore = useBattlePanelStore.getState();
    const battleStore = useBattleStore.getState();

    if (event.f.init === "1") {
      battleStore.clearEvents();
      battleStore.setBattleState("in-battle");
      battleStore.updateBattleWarriors(null);
    }

    if (event.f.w) {
      const battleWarriorsWithAccountId = addAccountIdsToWarriors(
        event.f.w,
        useBattleStore.getState().battleWarriors,
      );
      battleStore.updateBattleWarriors(battleWarriorsWithAccountId);
    }

    if (!battlePanelStore.isBattleCollectionEnabled) return;

    battleStore.addEvent(event);

    if (
      event.f.endBattle === 1 &&
      useBattleStore.getState().battleState === "in-battle"
    ) {
      const battleTurns = useBattleStore
        .getState()
        .events.reduce((acc: string[], curr) => {
          if (!curr.f || !curr.f.m) return acc;

          return [...acc, ...curr.f.m];
        }, []);

      const battleHash = await createSHA256Hash(JSON.stringify(battleTurns));

      if (useBattleStore.getState().lastBattleHash !== battleHash) {
        const events = mapBattleEventsToPayload(
          useBattleStore.getState().events,
        );

        if (events) {
          const hasNegativeId = useBattleStore
            .getState()
            .events.some((event) => {
              if (!event.f?.w) return false;
              return Object.keys(event.f.w).some((key) => {
                return key.startsWith("-");
              });
            });

          const teams = new Set<number>();
          useBattleStore.getState().events.forEach((event) => {
            if (!event.f?.w) return;
            Object.values(event.f.w).forEach((warrior) => {
              if (warrior.team !== undefined) {
                teams.add(warrior.team);
              }
            });
          });

          if (!hasNegativeId && teams.size > 1) {
            createBattle({
              accountId: String(accountId),
              characterId: String(characterId),
              world,
              events,
            });
          }

          if (hasNegativeId) {
            const deadNpcs = extractDeadNpcs(
              useBattleStore.getState().battleWarriors,
            );

            if (deadNpcs.length > 0) {
              const sortedByWt = [...deadNpcs].sort((a, b) => b.wt - a.wt);
              const topNpc = sortedByWt[0];

              if (topNpc) {
                const npcType = getNpcTypeByWt(
                  topNpc.wt,
                  topNpc.prof,
                  topNpc.type,
                );

                if (TRACKABLE_NPC_TYPES.has(npcType)) {
                  const heroInfo = Game.hero;

                  createKill({
                    world,
                    npc: topNpc,
                    characterId: String(characterId),
                    accountId: String(accountId),
                    characterName: heroInfo.nick,
                    characterLvl: heroInfo.lvl,
                    characterProf: heroInfo.prof,
                    characterIcon: heroInfo.img,
                  });
                }
              }
            }
          }
        }
      }

      battleStore.setLastBattleHash(battleHash);

      battleStore.clearEvents();
      battleStore.setBattleState("idle");
    }
  };

  return {
    handleBattleEvents,
  };
};
