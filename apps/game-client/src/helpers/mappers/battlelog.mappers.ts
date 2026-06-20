import type { BattleEventPayload, BattleEventWarriorPayload } from "@/api";
import type { GameEvent, W } from "@lootlog/margonem/game-events";
import { isEmpty } from "@/utils/object-utils";

const mapBattleWarriorToPayload = ({
  icon,
  lvl,
  name,
  originalId,
  prof,
  team,
}: W[string]): BattleEventWarriorPayload => ({
  icon,
  lvl,
  name,
  originalId,
  prof,
  team,
});

export const mapBattleEventsToPayload = (
  events: GameEvent[],
): BattleEventPayload[] | null => {
  if (!events || events.length === 0) return null;

  const result = events.map((event) => {
    const fightWarriors: Record<string, BattleEventWarriorPayload> = {};
    Object.entries(event.f?.w ?? {}).forEach(([key, warrior]) => {
      const entry = mapBattleWarriorToPayload(warrior);

      if (isEmpty(entry)) return;

      fightWarriors[key] = entry;
    });

    const f = event.f
      ? {
          m: event.f.m,
          endBattle: event.f.endBattle,
          init: event.f.init,
          auto: event.f.auto,
          w: isEmpty(fightWarriors) ? undefined : fightWarriors,
        }
      : undefined;

    const match_summary = event.match_summary
      ? {
          difficulty_rank: event.match_summary.difficulty_rank,
          result: event.match_summary.result,
          rating_delta: event.match_summary.rating_delta,
          opponent_lvl: event.match_summary.opponent_lvl,
          opponent_oplvl: event.match_summary.opponent_oplvl,
          opponent_rating: event.match_summary.opponent_rating,
          rating: event.match_summary.rating,
          status: event.match_summary.status,
          placement_cur: event.match_summary.placement_cur,
          placement_max: event.match_summary.placement_max,
          points_gained: event.match_summary.points_gained,
          daily_stage: event.match_summary.daily_stage
            ? {
                id: event.match_summary.daily_stage.id,
                points_cur: event.match_summary.daily_stage.points_cur,
                points_max: event.match_summary.daily_stage.points_max,
                points_step: event.match_summary.daily_stage.points_step,
                rewards_last: event.match_summary.daily_stage.rewards_last,
                rewards_cur: event.match_summary.daily_stage.rewards_cur,
                rewards_max: event.match_summary.daily_stage.rewards_max,
              }
            : undefined,
        }
      : undefined;

    return {
      f,
      ev: event.ev,
      match_summary,
      matchmaking_state: event.matchmaking_state,
    };
  });

  return result;
};
