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

    if (battlePanelStore.isBattleCollectionEnabled) {
      battleStore.addEvent(event);
    }

    if (
      event.f.endBattle === 1 &&
      useBattleStore.getState().battleState === "in-battle"
    ) {
      const battleWarriors = useBattleStore.getState().battleWarriors;
      const hasNpcInBattle = Object.keys(battleWarriors).some((key) =>
        key.startsWith("-"),
      );

      // Kill tracking - always runs regardless of isBattleCollectionEnabled
      if (hasNpcInBattle) {
        const deadNpcs = extractDeadNpcs(battleWarriors);

        if (deadNpcs.length > 0) {
          const sortedByWt = [...deadNpcs].sort((a, b) => b.wt - a.wt);
          const topNpc = sortedByWt[0];

          if (topNpc) {
            const npcType = getNpcTypeByWt(topNpc.wt, topNpc.prof, topNpc.type);

            if (TRACKABLE_NPC_TYPES.has(npcType)) {
              // Deduplicate kills by hashing the dead NPCs
              const killHash = await createSHA256Hash(
                JSON.stringify(deadNpcs.map((npc) => npc.id).sort()),
              );
              const lastKillHash = useBattleStore.getState().lastKillHash;

              if (killHash !== lastKillHash) {
                const { type: _, ...npcWithoutType } = topNpc;
                createKill({
                  world,
                  npc: npcWithoutType,
                  characterId: String(characterId),
                  accountId: String(accountId),
                });
                battleStore.setLastKillHash(killHash);
              }
            }
          }
        }
      }

      // Battle logging - only if enabled
      if (battlePanelStore.isBattleCollectionEnabled) {
        const battleTurns = useBattleStore
          .getState()
          .events.reduce((acc: string[], curr) => {
            if (!curr.f || !curr.f.m) return acc;

            return [...acc, ...curr.f.m];
          }, []);

        const battleHash = await createSHA256Hash(JSON.stringify(battleTurns));
        const lastBattleHash = useBattleStore.getState().lastBattleHash;

        if (lastBattleHash !== battleHash) {
          const events = mapBattleEventsToPayload(
            useBattleStore.getState().events,
          );

          if (events && !hasNpcInBattle) {
            const teams = new Set<number>();
            useBattleStore.getState().events.forEach((event) => {
              if (!event.f?.w) return;
              Object.values(event.f.w).forEach((warrior) => {
                if (warrior.team !== undefined) {
                  teams.add(warrior.team);
                }
              });
            });

            if (teams.size > 1) {
              createBattle({
                accountId: String(accountId),
                characterId: String(characterId),
                world,
                events,
              });
            }
          }
        }

        battleStore.setLastBattleHash(battleHash);
      }

      battleStore.clearEvents();
      battleStore.setBattleState("idle");
    }
  };

  return {
    handleBattleEvents,
  };
};
