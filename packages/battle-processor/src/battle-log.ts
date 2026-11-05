/**
 * The Margonem battle packets the processor reads, and the row grammar of
 * their `m` move log. Margonem renders the same rows in
 * `core/battle/BattleMessages.js`.
 */

export type BattleWarriorSnapshot = {
  originalId: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
};

type MatchSummary = {
  difficulty_rank: number;
  result: number;
  rating_delta: number;
  opponent_lvl: number;
  opponent_oplvl: number;
  opponent_rating: number;
  rating: number;
  status: number;
  placement_cur?: number;
  placement_max?: number;
  points_gained?: number;
  daily_stage?: {
    id: number;
    points_cur: number;
    points_max: number;
    points_step: number;
    rewards_last: number;
    rewards_cur: number;
    rewards_max: number;
  };
};

export type BattleEvent = {
  ev?: number;
  f?: {
    m?: string[];
    endBattle?: number;
    w?: Record<string, BattleWarriorSnapshot>;
  };
  match_summary?: MatchSummary;
};

export type BattlePayload = {
  accountId: string;
  characterId: string;
  world: string;
  events: BattleEvent[];
};

type ParsedAction = { actionType: string; param: string };

export type ParsedMove = {
  attackerId: string | null;
  defenderId: string | null;
  attackerHpPercentage: number | null;
  defenderHpPercentage: number | null;
  actions: ParsedAction[];
};

export type MatchmakingInfo = {
  difficultyRank: number;
  result: number;
  ratingDelta: number;
  opponentLvl: number;
  opponentOplvl: number;
  opponentRating: number;
  rating: number;
  status: number;
  pointsGained?: number;
  placementCur?: number;
  placementMax?: number;
  dailyStageId?: number;
  dailyPointsCur?: number;
  dailyPointsMax?: number;
  dailyPointsStep?: number;
  dailyRewardsLast?: number;
  dailyRewardsCur?: number;
  dailyRewardsMax?: number;
};

export type ParsedBattlePayload = {
  accountId: string;
  characterId: string;
  world: string;
  events: ParsedMove[];
  warriors: Record<string, BattleWarriorSnapshot>;
  duration?: number;
  matchmaking?: MatchmakingInfo;
};

/**
 * `winner=?` ends a battle without a winner: one a warrior fled from, or one
 * that reached the turn limit.
 */
export const NO_WINNER = "?";

const parseHpPercentage = (hp: string | undefined): number | null =>
  hp ? Number.parseFloat(hp.replace(",", ".")) : null;

/**
 * Splits each `actor=hp;target=hp;action=param;...` row. An id of `0` means
 * the row has no warrior on that side, such as a damage over time tick.
 */
export const parseBattleMoves = (
  events: readonly BattleEvent[],
): ParsedMove[] =>
  events
    .flatMap((event) => event.f?.m ?? [])
    .map((move) => {
      const [attackerPart, defenderPart, ...actions] = move.split(";");
      const [attackerId = "0", attackerHp] = (attackerPart ?? "0").split("=");
      const [defenderId = "0", defenderHp] = (defenderPart ?? "0").split("=");

      return {
        attackerId: attackerId !== "0" ? attackerId : null,
        defenderId: defenderId !== "0" ? defenderId : null,
        attackerHpPercentage: parseHpPercentage(attackerHp),
        defenderHpPercentage: parseHpPercentage(defenderHp),
        actions: actions.map((action) => {
          const [actionType = "", param = ""] = action.split("=");

          return { actionType, param };
        }),
      };
    });

/**
 * The first comma-separated number of a parameter, signed. The rest of a
 * parameter such as `wound=2817,20` is the percentage the value was weakened
 * by. A missing or textual parameter reads as `0`.
 */
export const parseSignedActionValue = (param: string): number => {
  const [firstParam = ""] = param.split(",");
  const value = Number.parseInt(firstParam, 10);

  return Number.isNaN(value) ? 0 : value;
};

export const parseActionValue = (param: string): number =>
  Math.abs(parseSignedActionValue(param));

/**
 * The warrior a parameter names in one of its comma-separated parts, such as
 * `Name(95%)` in `+oth_dmg=120,dmgf,Name(95%)` or `Name` in
 * `legbon_lastheal=300,Name`.
 */
export const parseNamedWarrior = (
  param: string,
  index: number,
): { name: string; hpPercentage: number | null } | null => {
  const part = param.split(",")[index]?.trim();

  if (!part) return null;

  const hpMatch = part.match(/\((\d+(?:[.,]\d+)?)%\)$/);
  const [name = ""] = part.split("(");
  const trimmedName = name.trim();

  if (!trimmedName) return null;

  return {
    name: trimmedName,
    hpPercentage: hpMatch?.[1] ? parseHpPercentage(hpMatch[1]) : null,
  };
};

export const calculateBattleDuration = (
  events: readonly BattleEvent[],
): number => {
  if (!events.length) {
    throw new Error("No events found in battle data");
  }

  const firstTimestamp = events[0]?.ev ?? 0;
  const lastTimestamp = events[events.length - 1]?.ev ?? 0;

  return lastTimestamp - firstTimestamp;
};

export const readMatchmakingInfo = (
  events: readonly BattleEvent[],
): MatchmakingInfo | undefined => {
  const summary = events.find((event) => event.match_summary)?.match_summary;

  if (!summary) return undefined;

  return {
    difficultyRank: summary.difficulty_rank,
    result: summary.result,
    ratingDelta: summary.rating_delta,
    opponentLvl: summary.opponent_lvl,
    opponentOplvl: summary.opponent_oplvl,
    opponentRating: summary.opponent_rating,
    rating: summary.rating,
    status: summary.status,
    pointsGained: summary.points_gained,
    placementCur: summary.placement_cur,
    placementMax: summary.placement_max,
    dailyStageId: summary.daily_stage?.id,
    dailyPointsCur: summary.daily_stage?.points_cur,
    dailyPointsMax: summary.daily_stage?.points_max,
    dailyPointsStep: summary.daily_stage?.points_step,
    dailyRewardsLast: summary.daily_stage?.rewards_last,
    dailyRewardsCur: summary.daily_stage?.rewards_cur,
    dailyRewardsMax: summary.daily_stage?.rewards_max,
  };
};
