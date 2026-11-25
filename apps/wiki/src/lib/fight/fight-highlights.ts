import type { FightRecord } from "./fight-summary";

const FIGHT_HIGHLIGHTS = [
  "typical",
  "shortest",
  "longest",
  "closestWin",
  "safestWin",
  "closestLoss",
  "worstLoss",
  "draw",
] as const;

type FightHighlightId = (typeof FIGHT_HIGHLIGHTS)[number];

export type FightHighlight = {
  readonly id: FightHighlightId;
  readonly index: number;
};

export type WinnerHpBucket = {
  readonly from: number;
  readonly to: number;
  readonly wins: readonly number[];
};

const TYPICAL_MOVE_WEIGHT = 0.05;

const hpMargin = (fight: FightRecord) =>
  (fight.hpLeft[0] ?? 0) - (fight.hpLeft[1] ?? 0);

const lowest = (
  fights: readonly FightRecord[],
  score: (fight: FightRecord) => number | null,
) => {
  let best: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  fights.forEach((fight, index) => {
    const value = score(fight);

    if (value !== null && value < bestScore) {
      best = index;
      bestScore = value;
    }
  });

  return best;
};

const middle = (values: readonly number[]) =>
  [...values].sort((left, right) => left - right)[
    Math.floor(values.length / 2)
  ] ?? 0;

const mostCommonWinner = (fights: readonly FightRecord[]) => {
  const counts = new Map<number | null, number>();

  for (const { winner } of fights) {
    counts.set(winner, (counts.get(winner) ?? 0) + 1);
  }

  return [...counts].reduce<readonly [number | null, number]>(
    (best, entry) => (entry[1] > best[1] ? entry : best),
    [null, 0],
  )[0];
};

export const fightHighlights = (
  fights: readonly FightRecord[],
): FightHighlight[] => {
  const typicalWinner = mostCommonWinner(fights);

  const typicalFights = fights.filter(
    (fight) => fight.winner === typicalWinner,
  );

  const typicalMoves = middle(typicalFights.map((fight) => fight.moves));
  const typicalMargin = middle(typicalFights.map(hpMargin));

  const won = (fight: FightRecord) => fight.winner === 0;
  const lost = (fight: FightRecord) => fight.winner === 1;

  const scores: Record<
    FightHighlightId,
    (fight: FightRecord) => number | null
  > = {
    typical: (fight) =>
      fight.winner === typicalWinner
        ? Math.abs(fight.moves - typicalMoves) * TYPICAL_MOVE_WEIGHT +
          Math.abs(hpMargin(fight) - typicalMargin)
        : null,
    shortest: (fight) => fight.moves,
    longest: (fight) => -fight.moves,
    closestWin: (fight) => (won(fight) ? hpMargin(fight) : null),
    safestWin: (fight) => (won(fight) ? -hpMargin(fight) : null),
    closestLoss: (fight) => (lost(fight) ? -hpMargin(fight) : null),
    worstLoss: (fight) => (lost(fight) ? hpMargin(fight) : null),
    draw: (fight) => (fight.winner === null ? 0 : null),
  };

  return FIGHT_HIGHLIGHTS.flatMap((id) => {
    const index = lowest(fights, scores[id]);

    return index === null ? [] : [{ id, index }];
  });
};

const WINNER_HP_BUCKETS = 20;

export const winnerHpBuckets = (
  fights: readonly FightRecord[],
  teams: number,
): WinnerHpBucket[] => {
  const buckets = Array.from({ length: WINNER_HP_BUCKETS }, (_, index) => ({
    from: index / WINNER_HP_BUCKETS,
    to: (index + 1) / WINNER_HP_BUCKETS,
    wins: Array.from({ length: teams }, () => 0),
  }));

  for (const { winner, hpLeft } of fights) {
    if (winner === null) continue;

    const bucket =
      buckets[
        Math.min(
          WINNER_HP_BUCKETS - 1,
          Math.floor((hpLeft[winner] ?? 0) * WINNER_HP_BUCKETS),
        )
      ];

    if (bucket) bucket.wins[winner] = (bucket.wins[winner] ?? 0) + 1;
  }

  return buckets;
};
