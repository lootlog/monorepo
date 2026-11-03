import { Schema } from "effect";

/**
 * What a hero detector reported. Margonem answers a detector scroll with
 * "grasuje w" for a hero alive on the map (`ROAMING`) and "pojawi się w" for
 * the map its next spawn is placed on (`SPAWNING`).
 */
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

/**
 * Why a sighting stopped being current. `PROBABLY_KILLED` is inferred from a
 * later detection that contradicts it; `KILLED` comes from a kill Lootlog
 * recorded itself.
 */
export const HeroSightingCloseReason = {
  KILLED: "KILLED",
  PROBABLY_KILLED: "PROBABLY_KILLED",
} as const;

export type HeroSightingCloseReason =
  (typeof HeroSightingCloseReason)[keyof typeof HeroSightingCloseReason];

export const HeroSightingCloseReasonSchema = Schema.Literals([
  HeroSightingCloseReason.KILLED,
  HeroSightingCloseReason.PROBABLY_KILLED,
]);
