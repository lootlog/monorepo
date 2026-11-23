import type { EventScoringAction } from "@lootlog/domain/scoring";
import type { BadgeProps } from "@lootlog/ui/components/badge";

type ScoringTone = "base" | "bonus" | "adjusted";

export const SCORING_ACTION_TONE = {
  SET_BASE: "base",
  ADD_BONUS: "bonus",
  ZERO_BASE: "adjusted",
} as const satisfies Record<EventScoringAction["type"], ScoringTone>;

export const SCORING_TONE_TEXT_CLASS = {
  base: "text-primary",
  bonus: "text-signal-ready",
  adjusted: "text-signal-timer",
} as const satisfies Record<ScoringTone, string>;

export const SCORING_TONE_BADGE_VARIANT = {
  base: "tinted",
  bonus: "ready",
  adjusted: "timer",
} as const satisfies Record<ScoringTone, BadgeProps["variant"]>;
