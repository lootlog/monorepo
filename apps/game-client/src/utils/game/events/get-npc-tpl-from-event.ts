import { useGameStore } from "@/store/game.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";
import { isHeroTrackerName } from "@lootlog/domain/npc-type";

export type EventNpcTemplatesById = ReadonlyMap<
  number,
  NonNullable<GameEvent["npc_tpls"]>[number]
>;

export const getNpcTplFromEvent = (
  templatesById: EventNpcTemplatesById,
  templateId: number,
): NpcTpl | undefined => {
  const templateBase = templatesById.get(templateId);

  if (!templateBase) return undefined;

  // A Hero Tracker template has a level but no weight, profession or type.
  if (isHeroTrackerName(templateBase.nick) && templateBase.level) {
    return {
      ...templateBase,
      prof: "",
      type: 0,
      wt: 0,
      lvl: templateBase.level,
    };
  }

  const { prof, type, warrior_type: wt } = templateBase;

  if (!wt || !prof || type === undefined) return undefined;

  const heroLevel = useGameStore.getState().game?.hero.level;

  const lvl =
    templateBase.elasticLevelFactor === 0 ? heroLevel : templateBase.level;

  if (!lvl) return undefined;

  return { ...templateBase, prof, type, wt, lvl };
};
