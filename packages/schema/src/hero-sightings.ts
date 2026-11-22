import { Schema } from "effect";

export const HeroSightingState = {
  ROAMING: "ROAMING",
  SPAWNING: "SPAWNING",
} as const;

export type HeroSightingState =
  (typeof HeroSightingState)[keyof typeof HeroSightingState];

export const HeroSightingStateSchema = Schema.Literals([
  HeroSightingState.ROAMING,
  HeroSightingState.SPAWNING,
]);

export const HeroSightingCloseReason = {
  KILLED: "KILLED",
  PROBABLY_KILLED: "PROBABLY_KILLED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type HeroSightingCloseReason =
  (typeof HeroSightingCloseReason)[keyof typeof HeroSightingCloseReason];

export const HeroSightingCloseReasonSchema = Schema.Literals([
  HeroSightingCloseReason.KILLED,
  HeroSightingCloseReason.PROBABLY_KILLED,
  HeroSightingCloseReason.WITHDRAWN,
]);
