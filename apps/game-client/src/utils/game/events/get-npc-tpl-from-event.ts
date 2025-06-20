import { Game } from "@/lib/game";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { NpcTpl } from "@/types/margonem/npc-tpl-manager";

export const getNpcTplFromEvent = (
  event: GameEvent,
  templateId: number
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
