import { Game } from "@/lib/game";
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
) => {
  const party: PartyMember[] = [];
  const npcs: Npc[] = [];

  Object.entries(battleWarriors).forEach(([key, value]) => {
    if (key.startsWith("-")) {
      const npcData = Game.getNpc(value.originalId);

      if (!npcData) {
        npcs.push({
          id: value.originalId,
          name: value.name,
          icon: value.icon,
          hpp: value.hpp,
          prof: value.prof,
          lvl: value.lvl,
          wt: value.wt,
          location: Game.map.name,
          type: value.type ?? 2,
        });

        return;
      }

      npcs.push({
        id: npcData.tpl,
        name: npcData.nick,
        icon: npcData.icon,
        hpp: value.hpp,
        prof: npcData.prof,
        lvl: npcData.lvl,
        wt: npcData.wt,
        location: Game.map.name,
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
