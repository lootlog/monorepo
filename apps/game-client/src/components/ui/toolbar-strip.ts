/**
 * Flat, full-width bars stacked under a window title bar (guild switcher,
 * world selector, filters). Neighbouring strips overlap by one pixel so a
 * single rule separates them.
 */
export const toolbarStripClassName =
  "ll:border-y ll:border-x-0 ll:border-gray-400/40 ll:bg-black/20";

/** Vertical rule between neighbouring controls inside one strip. */
export const toolbarStripDividerClassName =
  "ll:border-0 ll:border-l ll:border-solid ll:border-gray-400/40";

/** Bleeds a strip through the 4px window padding and onto the previous strip's rule. */
export const toolbarStripBleedClassName = "ll:-mx-1 ll:-mt-px ll:w-auto";
