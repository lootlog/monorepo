/**
 * Flat, full-width bars stacked under a window title bar (guild switcher,
 * world selector, filters). Neighbouring strips overlap by one pixel so a
 * single rule separates them.
 *
 * Every strip is 30px tall: a 28px (`h-7`) content row plus the 1px rule on
 * each side. Keep the guild switcher tiles, the world selector trigger, and
 * filter rows on that size so stacked strips line up.
 */
export const toolbarStripClassName =
  "ll:border-y ll:border-x-0 ll:border-gray-400/40 ll:bg-black/20";

/** Single-row content of a strip: 28px tall, controls stretched to the rules. */
export const toolbarStripRowClassName =
  "ll:flex ll:h-7 ll:min-w-0 ll:items-stretch";

/** Vertical rule between neighbouring controls inside one strip. */
export const toolbarStripDividerClassName =
  "ll:border-0 ll:border-l ll:border-solid ll:border-gray-400/40";

/** Bleeds a strip through the 4px window padding and onto the previous strip's rule. */
export const toolbarStripBleedClassName = "ll:-mx-1 ll:-mt-px ll:w-auto";
