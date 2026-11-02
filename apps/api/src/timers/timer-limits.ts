export const TIMER_LIMITS = {
  MAX_MANUAL_TIMER_NAME_LENGTH: 20,
  MAX_SPAWN_WINDOW_DAYS: 7,
  MIN_SPAWN_OFFSET_SECONDS: 10,
  // A Hero Tracker keeps its entrance open for 20 minutes; the margin covers
  // clock skew without accepting an arbitrary future close.
  MAX_HERO_TRACKER_ENTRANCE_SECONDS: 30 * 60,
  MAX_HERO_TRACKER_ENTRANCE_PAST_SECONDS: 60,
} as const;

export const TIMER_TYPES = {
  CUSTOM_MANUAL: 999,
} as const;
