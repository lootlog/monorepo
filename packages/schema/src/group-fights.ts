import { Schema } from "effect";

/** Margonem caps a battle team at ten players. */
export const GROUP_FIGHT_FULL_TEAM_SIZE = 10;
/** Default collection requires at least eight players on each side. */
export const GROUP_FIGHT_MIN_TEAM_SIZE = 8;

export const GROUP_FIGHT_COLLECTION_MODES = ["FULL_TEAMS", "ALL"] as const;
export type GroupFightCollectionMode =
  (typeof GROUP_FIGHT_COLLECTION_MODES)[number];
export const GroupFightCollectionModeSchema = Schema.Literals(
  GROUP_FIGHT_COLLECTION_MODES,
);

export const GROUP_FIGHT_TEAMS = [1, 2] as const;
export type GroupFightTeam = (typeof GROUP_FIGHT_TEAMS)[number];
export const GroupFightTeamSchema = Schema.Literals(GROUP_FIGHT_TEAMS);

export const GROUP_FIGHT_OUTCOMES = ["TEAM_WON", "NO_WINNER"] as const;
export type GroupFightOutcome = (typeof GROUP_FIGHT_OUTCOMES)[number];
export const GroupFightOutcomeSchema = Schema.Literals(GROUP_FIGHT_OUTCOMES);

export const GROUP_FIGHT_PARTICIPANT_RESULTS = [
  "WIN",
  "LOSS",
  "DRAW",
  "FLEE",
] as const;
export type GroupFightParticipantResult =
  (typeof GROUP_FIGHT_PARTICIPANT_RESULTS)[number];
export const GroupFightParticipantResultSchema = Schema.Literals(
  GROUP_FIGHT_PARTICIPANT_RESULTS,
);

export const GROUP_FIGHT_SIDE_RESULTS = ["WIN", "LOSS", "DRAW"] as const;
export type GroupFightSideResult = (typeof GROUP_FIGHT_SIDE_RESULTS)[number];
export const GroupFightSideResultSchema = Schema.Literals(
  GROUP_FIGHT_SIDE_RESULTS,
);

export const GROUP_FIGHT_QUALIFICATION_SOURCES = [
  "CATALOG",
  "NPC_OBSERVED",
] as const;
export type GroupFightQualificationSource =
  (typeof GROUP_FIGHT_QUALIFICATION_SOURCES)[number];
export const GroupFightQualificationSourceSchema = Schema.Literals(
  GROUP_FIGHT_QUALIFICATION_SOURCES,
);

export const GROUP_FIGHT_REJECTION_REASONS = [
  "GROUP_FIGHTS_DISABLED",
  "INCOMPLETE_TEAMS",
  "MISSING_MEMBER",
] as const;
export type GroupFightRejectionReason =
  (typeof GROUP_FIGHT_REJECTION_REASONS)[number];
export const GroupFightRejectionReasonSchema = Schema.Literals(
  GROUP_FIGHT_REJECTION_REASONS,
);

export const GROUP_FIGHT_PERIODS = [
  "today",
  "week",
  "month",
  "all",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
  "90d",
] as const;
export type GroupFightPeriod = (typeof GROUP_FIGHT_PERIODS)[number];
export const GroupFightPeriodSchema = Schema.Literals(GROUP_FIGHT_PERIODS);
