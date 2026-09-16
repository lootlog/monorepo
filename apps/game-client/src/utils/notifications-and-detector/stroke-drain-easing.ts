/**
 * Stroke drains (`stroke-dashoffset`) animate on the main thread: every frame
 * in which the sampled value changes costs a style recalc and a repaint of
 * the whole card. A stepped easing keeps the drain visually linear while
 * capping how many frames actually change, so a card in cooldown repaints
 * ten times a second instead of sixty.
 */
export const STROKE_DRAIN_STEP_MS = 100;

export const getStrokeDrainEasing = (durationMs: number) =>
  `steps(${Math.max(1, Math.ceil(durationMs / STROKE_DRAIN_STEP_MS))}, end)`;
