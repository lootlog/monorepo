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
