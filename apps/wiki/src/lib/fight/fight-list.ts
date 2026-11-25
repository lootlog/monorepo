import type { FightRecord } from "./fight-summary";

export const FIGHT_OUTCOMES = ["won", "lost", "drawn"] as const;

export type FightOutcome = (typeof FIGHT_OUTCOMES)[number];

export type FightSortKey = "index" | "moves" | "myHp" | "theirHp";

export type FightListView = {
  readonly outcome: FightOutcome | null;
  readonly lengths: { readonly from: number; readonly to: number } | null;
  readonly sort: { readonly key: FightSortKey; readonly descending: boolean };
};

export const DEFAULT_FIGHT_LIST_VIEW: FightListView = {
  outcome: null,
  lengths: null,
  sort: { key: "index", descending: false },
};

export const fightOutcome = (winner: number | null): FightOutcome => {
  if (winner === null) return "drawn";

  return winner === 0 ? "won" : "lost";
};

const sortValue = (fight: FightRecord, index: number, key: FightSortKey) => {
  switch (key) {
    case "index":
      return index;
    case "moves":
      return fight.moves;
    case "myHp":
      return fight.hpLeft[0] ?? 0;
    case "theirHp":
      return fight.hpLeft[1] ?? 0;
  }
};

export const listFights = (
  fights: readonly FightRecord[],
  view: FightListView,
): number[] => {
  const direction = view.sort.descending ? -1 : 1;

  return fights
    .flatMap((fight, index) => {
      if (view.outcome && fightOutcome(fight.winner) !== view.outcome)
        return [];

      if (
        view.lengths &&
        (fight.moves < view.lengths.from || fight.moves > view.lengths.to)
      )
        return [];

      return [index];
    })
    .sort((left, right) => {
      const leftFight = fights[left];
      const rightFight = fights[right];

      if (!leftFight || !rightFight) return 0;

      return (
        direction *
          (sortValue(leftFight, left, view.sort.key) -
            sortValue(rightFight, right, view.sort.key)) || left - right
      );
    });
};
