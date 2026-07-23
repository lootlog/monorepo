import type { RuntimeGameSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";

export type PartyMember = {
  id: number;
  name: string;
  icon: string;
  hpp: number;
  prof: string;
  lvl: number;
  accountId: number;
};

export type Npc = {
  id: number;
  name: string;
  icon: string;
  hpp: number;
  prof: string;
  lvl: number;
  wt: number;
  location: string;
  type: number;
};

export const getBattleParticipants = (
  battleWarriors: BattleWarriorsWithAccountId,
  game: RuntimeGameSnapshot | null = useGameStore.getState().game,
) => {
  const party: PartyMember[] = [];
  const npcs: Npc[] = [];

  Object.entries(battleWarriors).forEach(([key, value]) => {
    if (key.startsWith("-")) {
      const npcData = useNpcsStore.getState().getNpc(value.originalId);

      if (!npcData) {
        npcs.push({
          id: value.originalId,
          name: value.name,
          icon: value.icon,
          hpp: value.hpp,
          prof: value.prof,
          lvl: value.lvl,
          wt: value.wt,
          location: game?.map.name ?? "",
          type: value.type ?? 2,
        });

        return;
      }

      npcs.push({
        id: npcData.templateId,
        name: npcData.name,
        icon: npcData.icon,
        hpp: value.hpp,
        prof: npcData.profession,
        lvl: npcData.level,
        wt: npcData.weight,
        location: game?.map.name ?? "",
        type: npcData.type,
      });
      return;
    }

    party.push({
      id: value.originalId,
      name: value.name,
      icon: value.icon,
      hpp: value.hpp,
      prof: value.prof,
      lvl: value.lvl,
      accountId: value.accountId ?? 0,
    });
  });

  return { party, npcs };
};
