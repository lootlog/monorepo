import { useGameStore } from "@/store/game.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";

export type EventNpcTemplatesById = ReadonlyMap<
  number,
  NonNullable<GameEvent["npc_tpls"]>[number]
>;

export const getNpcTplFromEvent = (
  templatesById: EventNpcTemplatesById,
  templateId: number,
): NpcTpl | undefined => {
  const templateBase = templatesById.get(templateId);

  if (!templateBase || !templateBase.warrior_type || !templateBase.prof)
    return undefined;

  const heroLevel = useGameStore.getState().game?.hero.level;

  const lvl =
    templateBase.elasticLevelFactor === 0 ? heroLevel : templateBase.level;

  if (!lvl) return undefined;

  return {
    ...templateBase,
    wt: templateBase.warrior_type,
    lvl,
  };
};
