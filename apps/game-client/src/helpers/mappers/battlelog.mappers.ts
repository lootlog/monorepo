import type { UseCreateBattleOptions } from "@/hooks/api/use-create-battle";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import isEmpty from "lodash/isEmpty";
import pick from "lodash/pick";

export const mapBattleEventsToPayload = (
  events: GameEvent[],
): UseCreateBattleOptions["events"] | null => {
  if (!events || events.length === 0) return null;

  const result = events.map((event) => {
    const fight = pick(event.f, ["m", "endBattle", "init", "auto"]);

    const fightWarriors: Record<string, any> = {};
    Object.entries(event.f?.w || []).map(([key, warrior]) => {
      const entry = pick(warrior, [
        "originalId",
        "name",
        "lvl",
        "prof",
        "icon",
        "team",
      ]);

      if (isEmpty(entry)) return;

      fightWarriors[key] = entry;
    });

    const party = pick(event.party, [
      "id",
      "name",
      "icon",
      "team",
      "commander",
    ]);

    return {
      f: { ...fight, w: !isEmpty(fightWarriors) ? fightWarriors : undefined },
      ev: event.ev,
      party: !isEmpty(party) ? party : undefined,
    };
  });

  // @ts-ignore
  return result;
};
