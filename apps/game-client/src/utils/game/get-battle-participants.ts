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

/**
 * `runtimeId` is the looted spawn (battle `originalId`), `templateId` its
 * Margonem template or null when it was not observed. `id` keeps the value
 * older API revisions expect: the template when known, else the runtime id.
 */
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
      const runtimeId = value.originalId;

      const npcData =
        value.mapNpc ?? useNpcsStore.getState().getMapNpc(runtimeId);

      // The map never showed this NPC. The warrior names no template to read
      // the Margonem type from and NI never reads a warrior `type`, so 2, the
      // plain monster type, stands in when the warrior has none.
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
