export const LABEL_COLUMN_WIDTH = 50;

export const MIN_ROW_HEIGHT = 56;

export const HEADER_HEIGHT = 56;

export const DAYS = Array.from({ length: 7 });

export const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}:00`,
);

/**
 * The schedule bar's height, as the list toolbar measures: a row of 2rem
 * controls with 0.5rem insets (2.5rem controls with 0.25rem insets on touch
 * layouts) and its hairline. In rem, so it grows with resized text.
 */
export const SCHEDULE_BAR_HEIGHT = "calc(3rem + 1px)";

/** An hour's label in the schedule's time column. */
export const SCHEDULE_HOUR_LABEL_CLASS =
  "pt-1 pr-2 text-right text-[11px] leading-none tabular-nums text-muted-foreground";

/** Time that has passed, where no reservation can start. */
export const SCHEDULE_PAST_CLASS = "bg-muted/40";

/** The dashed half-hour rule inside an hour slot; the slot is `relative`. */
export const SCHEDULE_HALF_HOUR_RULE_CLASS =
  "after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-dashed after:border-border/60";
