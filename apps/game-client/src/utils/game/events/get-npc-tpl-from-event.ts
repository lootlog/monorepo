import { Game } from "@/lib/game";
import type { GameEvent } from "@lootlog/margonem-types/game-events";
import type { NpcTpl } from "@lootlog/margonem-types";

export const getNpcTplFromEvent = (
  event: GameEvent,
  templateId: number,
): NpcTpl | undefined => {
  const templateBase = event.npc_tpls?.find((tpl) => tpl.id === templateId);

  if (!templateBase || !templateBase.warrior_type || !templateBase.prof)
    return undefined;

  const lvl =
    templateBase.elasticLevelFactor === 0 ? Game.hero.lvl : templateBase.level;

  if (!lvl) return undefined;

  return {
    ...templateBase,
    wt: templateBase.warrior_type,
    lvl,
  };
};
