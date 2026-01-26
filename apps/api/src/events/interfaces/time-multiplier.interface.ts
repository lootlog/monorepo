/**
 * Time-of-day multiplier configuration for event points.
 * Allows different point multipliers based on when kills occur.
 */
export interface TimeOfDayMultiplier {
  /** Start time in "HH:mm" format */
  from: string;
  /** End time in "HH:mm" format */
  to: string;
  /** Multiplier to apply during this time range */
  multiplier: number;
}

/**
 * Trackers multiplier configuration.
 * Maps number of assigned trackers to point multiplier.
 * Keys are string numbers (e.g., "1", "2", "3").
 */
export type TrackersMultipliers = Record<string, number>;

/**
 * Maps count multiplier configuration.
 * Maps number of hero maps to point multiplier.
 * Keys are string numbers (e.g., "1", "2", "3").
 */
export type MapsCountMultipliers = Record<string, number>;

/**
 * Tracking duration multiplier configuration.
 * Maps minimum tracking percentage thresholds to point multipliers.
 * Keys are string numbers representing percentage (e.g., "50", "75", "100").
 * Example: {"50": 0.5, "75": 0.75, "100": 1.0}
 * - Player tracking >= 100% of window = 1.0x multiplier
 * - Player tracking >= 75% of window = 0.75x multiplier
 * - Player tracking >= 50% of window = 0.5x multiplier
 */
export type TrackingDurationMultipliers = Record<string, number>;
