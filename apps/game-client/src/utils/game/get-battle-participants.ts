import { Game } from "@/lib/game";
import { W } from "@/types/margonem/game-events/f";

export type PartyMember = {
  id: number;
  name: string;
  icon: string;
  hpp: number;
  prof: string;
  lvl: number;
  accountId: number;
};

export type KilledNpc = {
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
  initialParticipants: W | null,
  endParticipants: W | null
) => {
  if (!initialParticipants) return { party: [], npcs: [] };

  const { party, npcs } = Object.entries(initialParticipants).reduce(
    (acc: { npcs: KilledNpc[]; party: PartyMember[] }, [key, value]) => {
      if (key === Game.hero.id.toString()) {
        acc.party.push({
          id: Game.hero.id,
          name: Game.hero.nick,
          icon: Game.hero.img,
          hpp: value.hpp,
          prof: Game.hero.prof,
          lvl: Game.hero.lvl,
          accountId: Game.hero.account,
        });

        return acc;
      }

      if (key.startsWith("-")) {
        const hpp = endParticipants?.[key.replace("-", "")]?.hpp ?? 0;
        const npcData = Game.getNpc(value.originalId);

        if (!npcData) {
          acc.npcs.push({
            id: value.originalId,
            name: value.name,
            icon: value.icon,
            hpp: hpp,
            prof: value.prof,
            lvl: value.lvl,
            wt: value.wt,
            location: Game.map.name,
            type: value.type ?? 2,
          });

          return acc;
        }

        acc.npcs.push({
          id: npcData.tpl,
          name: npcData.nick,
          icon: npcData.icon,
          hpp: hpp,
          prof: npcData.prof,
          lvl: npcData.lvl,
          wt: npcData.wt,
          location: Game.map.name,
          type: npcData.type,
        });

        return acc;
      }

      let other = Game.getOther(key);
      if (other) {
        acc.party.push({
          id: +other.id,
          name: other.nick,
          icon: other.icon,
          hpp: value.hpp,
          prof: other.prof,
          lvl: other.lvl,
          accountId: other.account,
        });
      }

      return acc;
    },
    { party: [], npcs: [] }
  );

  return { party, npcs };
};
