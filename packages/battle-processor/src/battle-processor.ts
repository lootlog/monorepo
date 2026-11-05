import {
  calculateBattleDuration,
  parseBattleMoves,
  readMatchmakingInfo,
  type BattlePayload,
  type BattleWarriorSnapshot,
  type MatchmakingInfo,
  type ParsedBattlePayload,
  type ParsedMove,
} from "./battle-log.js";
import { CombatTotals } from "./combat-totals.js";
import { resolveBattleOutcome, type BattleOutcome } from "./outcome.js";
import {
  createEmptyActionCoverage,
  TimelineRecorder,
  type BattleActionCoverage,
  type BattleTimelineTurn,
} from "./timeline.js";
import { getLegendaryTotal, WarriorRoster, type Warrior } from "./warrior.js";

export type BattleAnalysis = {
  duration: number;
  warriors: Warrior[];
  parsedMoves: ParsedMove[];
  outcome: BattleOutcome;
  type: string;
  battleTimeline: BattleTimelineTurn[];
  actionCoverage: BattleActionCoverage;
  matchmaking?: MatchmakingInfo;
};

type AnalysisInput = {
  roster: WarriorRoster;
  characterId: string;
  moves: ParsedMove[];
  ended: (totals: CombatTotals) => boolean;
};

const getBattleType = (roster: WarriorRoster): string => {
  const warriors = Array.from(roster.byId.values());

  const teamSize = (team: number) =>
    warriors.filter((warrior) => warrior.team === team).length;

  return `${teamSize(1)}v${teamSize(2)}`;
};

const applyDerivedStats = (
  roster: WarriorRoster,
  outcome: BattleOutcome,
): void => {
  for (const warrior of roster.byId.values()) {
    warrior.damageDealtAfterDefensivePercentage =
      warrior.damageDealt > 0
        ? Math.round(
            (warrior.damageDealtAfterDefensive / warrior.damageDealt) * 10000,
          ) / 100
        : 0;
    warrior.legbons = getLegendaryTotal(warrior);

    // Margonem reports honor points unsigned; the outcome gives the sign.
    const isWinning = warrior.team === outcome.winningTeam;
    const isLosing = warrior.team === outcome.losingTeam;

    if ((isLosing && warrior.ph > 0) || (isWinning && warrior.ph < 0)) {
      warrior.ph = -warrior.ph;
    }
  }
};

export class BattleProcessor {
  /** Statistics mode skips timeline diagnostics while preserving persisted combat results. */
  constructor(private readonly mode: "full" | "statistics" = "full") {}

  processBattle(battleData: BattlePayload): BattleAnalysis {
    const duration = calculateBattleDuration(battleData.events);
    const roster = new WarriorRoster();

    for (const event of battleData.events) {
      for (const [id, snapshot] of Object.entries(event.f?.w ?? {})) {
        roster.add(id, snapshot);
      }
    }

    return {
      duration,
      ...this.analyze({
        roster,
        characterId: battleData.characterId,
        moves: parseBattleMoves(battleData.events),
        ended: (totals) =>
          battleData.events.some((event) => event.f?.endBattle) ||
          totals.winner !== "" ||
          totals.loser !== "",
      }),
      matchmaking: readMatchmakingInfo(battleData.events),
    };
  }

  /** Legacy battles stored only their parsed rows and warrior snapshots. */
  processParsedBattle(battleData: ParsedBattlePayload): BattleAnalysis {
    const roster = new WarriorRoster();

    for (const [id, snapshot] of Object.entries<BattleWarriorSnapshot>(
      battleData.warriors,
    )) {
      roster.add(id, snapshot);
    }

    return {
      duration: battleData.duration ?? 0,
      ...this.analyze({
        roster,
        characterId: battleData.characterId,
        moves: battleData.events,
        ended: () => true,
      }),
      matchmaking: battleData.matchmaking,
    };
  }

  private analyze({
    roster,
    characterId,
    moves,
    ended,
  }: AnalysisInput): Omit<BattleAnalysis, "duration" | "matchmaking"> {
    const totals = new CombatTotals(roster, characterId);
    const timeline = this.mode === "full" ? new TimelineRecorder(roster) : null;

    for (const [moveIndex, move] of moves.entries()) {
      timeline?.recordMove(moveIndex, move);
      totals.recordMove(move);
    }

    const outcome = resolveBattleOutcome({
      roster,
      lastHp: totals.lastHp,
      winner: totals.winner,
      loser: totals.loser,
      hasFlee: totals.hasFlee,
      ended: ended(totals),
    });

    applyDerivedStats(roster, outcome);

    return {
      warriors: Array.from(roster.byId.values()),
      parsedMoves: moves,
      outcome,
      type: getBattleType(roster),
      battleTimeline: timeline?.turns ?? [],
      actionCoverage:
        timeline?.getActionCoverage() ?? createEmptyActionCoverage(),
    };
  }
}
