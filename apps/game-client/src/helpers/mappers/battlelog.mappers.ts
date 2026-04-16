import type { BattleEventPayload } from "@/api";
import type { GameEvent, W } from "@lootlog/margonem/game-events";
import { isEmpty, pick } from "@/utils/object-utils";

export const mapBattleEventsToPayload = (
  events: GameEvent[],
): BattleEventPayload[] | null => {
  if (!events || events.length === 0) return null;

  const result = events.map((event) => {
    const fightWarriors: W = {} as W;
    Object.entries(event.f?.w || {}).forEach(([key, warrior]) => {
      const entry = pick(warrior, [
        "originalId",
        "name",
        "lvl",
        "prof",
        "icon",
        "team",
      ]);

      if (isEmpty(entry)) return;

      fightWarriors[key] = entry as W[string];
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
        }
      : undefined;

    return {
      f,
      ev: event.ev,
      match_summary,
      matchmaking_state: event.matchmaking_state,
    };
  });

  // @ts-expect-error - Type mismatch expected
  return result;
};
