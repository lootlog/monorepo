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
