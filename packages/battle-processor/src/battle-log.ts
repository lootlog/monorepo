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
  placement_cur?: number | undefined;
  placement_max?: number | undefined;
  points_gained?: number | undefined;
  daily_stage?:
    | {
        id: number;
        points_cur: number;
        points_max: number;
        points_step: number;
        rewards_last: number;
        rewards_cur: number;
        rewards_max: number;
      }
    | undefined;
};

export type BattleEvent = {
  ev?: number | undefined;
  f?:
    | {
        m?: string[] | undefined;
        endBattle?: number | undefined;
        w?: Record<string, BattleWarriorSnapshot> | undefined;
      }
    | undefined;
  match_summary?: MatchSummary | undefined;
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
  pointsGained?: number | undefined;
  placementCur?: number | undefined;
  placementMax?: number | undefined;
  dailyStageId?: number | undefined;
  dailyPointsCur?: number | undefined;
  dailyPointsMax?: number | undefined;
  dailyPointsStep?: number | undefined;
  dailyRewardsLast?: number | undefined;
  dailyRewardsCur?: number | undefined;
  dailyRewardsMax?: number | undefined;
};

export const NO_WINNER = "?";

const parseHpPercentage = (hp: string): number | null => {
  const hpPercentage = Number.parseFloat(hp.replace(",", "."));

  return Number.isNaN(hpPercentage) ? null : hpPercentage;
};

const splitPair = (part: string): [key: string, value: string] => {
  const [key = "", value = ""] = part.split("=");

  return [key, value];
};

const parseMoveSide = (part = "0") => {
  const [id, hp] = splitPair(part);

  return {
    id: id !== "0" && id !== "" ? id : null,
    hpPercentage: parseHpPercentage(hp),
  };
};

export const parseBattleMoves = (
  events: readonly BattleEvent[],
): ParsedMove[] =>
  events
    .flatMap((event) => event.f?.m ?? [])
    .map((move) => {
      const [attackerPart, defenderPart, ...actions] = move.split(";");
      const attacker = parseMoveSide(attackerPart);
      const defender = parseMoveSide(defenderPart);

      return {
        attackerId: attacker.id,
        defenderId: defender.id,
        attackerHpPercentage: attacker.hpPercentage,
        defenderHpPercentage: defender.hpPercentage,
        actions: actions.map((action) => {
          const [actionType, param] = splitPair(action);

          return { actionType, param };
        }),
      };
    });

export const parseSignedActionValue = (param: string): number => {
  const [firstParam = ""] = param.split(",");
  const value = Number.parseInt(firstParam, 10);

  return Number.isNaN(value) ? 0 : value;
};

export const parseActionValue = (param: string): number =>
  Math.abs(parseSignedActionValue(param));

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
