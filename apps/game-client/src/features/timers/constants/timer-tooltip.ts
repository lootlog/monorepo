/** Longest list of players or enemies a timer tooltip shows before summarising the rest. */
export const TIMER_TOOLTIP_MAX_ROWS = 8;

/**
 * Longest list an expanded timer tooltip shows. A busy map holds dozens of
 * players and enemies, and a tooltip taller than the game window is cut off.
 */
export const TIMER_TOOLTIP_EXPANDED_MAX_ROWS = 12;

/** How long a timer tooltip stays open before it lists every player and enemy. */
export const TIMER_TOOLTIP_EXPAND_DELAY_MS = 2_000;
