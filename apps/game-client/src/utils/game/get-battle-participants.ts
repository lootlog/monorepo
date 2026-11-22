import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
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
  runtimeId: number;
  templateId: number | null;
  name: string;
  icon: string;
  hpp: number;
  prof: string;
  lvl: number;
  wt: number;
  location: string;
  mapId?: number;
  x?: number;
  y?: number;
  type: number;
  isHeroFromEvent?: boolean;
};

export const getBattleParticipants = (
  battleWarriors: BattleWarriorsWithAccountId,
  game: RuntimeGameSnapshot | null = useGameStore.getState().game,
) => {
  const party: PartyMember[] = [];
  const npcs: Npc[] = [];

  Object.entries(battleWarriors).forEach(([key, value]) => {
    if (key.startsWith("-")) {
      const runtimeId = value.originalId;

      const npcData =
        value.mapNpc ?? useNpcsStore.getState().getMapNpc(runtimeId);

      if (!npcData) {
        npcs.push({
          id: runtimeId,
          runtimeId,
          templateId: null,
          name: value.name,
          icon: normalizeNpcIcon(value.icon),
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
        id: npcData.templateId ?? runtimeId,
        runtimeId,
        templateId: npcData.templateId,
        name: npcData.name,
        icon: npcData.icon,
        hpp: value.hpp,
        prof: npcData.profession,
        lvl: npcData.level,
        wt: npcData.weight,
        location: game?.map.name ?? "",
        mapId: game?.map.id,
        x: npcData.x,
        y: npcData.y,
        type: npcData.type,
        isHeroFromEvent: npcData.isHeroFromEvent,
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
