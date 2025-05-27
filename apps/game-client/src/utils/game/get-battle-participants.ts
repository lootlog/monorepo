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
  endParticipants: W | null,
  newInterface: boolean
) => {
  if (!initialParticipants) return { party: [], npcs: [] };

  const { party, npcs } = Object.entries(initialParticipants).reduce(
    (acc: { npcs: KilledNpc[]; party: PartyMember[] }, [key, value]) => {
      if (
        key ===
        (newInterface
          ? window.Engine.hero.d.id.toString()
          : window.hero.id.toString())
      ) {
        acc.party.push({
          id: newInterface ? window.Engine.hero.d.id : window.hero.id,
          name: newInterface ? window.Engine.hero.d.nick : window.hero.nick,
          icon: newInterface ? window.Engine.hero.d.img : window.hero.img,
          hpp: value.hpp,
          prof: newInterface ? window.Engine.hero.d.prof : window.hero.prof,
          lvl: newInterface ? window.Engine.hero.d.lvl : window.hero.lvl,
          accountId: newInterface
            ? window.Engine.hero.d.account
            : window.hero.account,
        });

        return acc;
      }

      if (key.startsWith("-")) {
        const hpp = endParticipants?.[key.replace("-", "")]?.hpp ?? 0;
        const npcData = newInterface
          ? window.Engine.npcs.getById(value.originalId).d
          : window.g.npc[value.originalId];

        if (!npcData) {
          acc.npcs.push({
            id: value.originalId,
            name: value.name,
            icon: value.icon,
            hpp: hpp,
            prof: value.prof,
            lvl: value.lvl,
            wt: value.wt,
            location: newInterface ? window.Engine.map.d.name : window.map.name,
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
          location: newInterface ? window.Engine.map.d.name : window.map.name,
          type: npcData.type,
        });

        return acc;
      }

      let other;
      if (newInterface) {
        const othersData = window.Engine.others.check();
        other = othersData[key]?.d;
      } else {
        other = window.g.other[key];
      }

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
