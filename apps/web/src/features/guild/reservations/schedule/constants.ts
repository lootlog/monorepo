export const LABEL_COLUMN_WIDTH = 50;

export const MIN_ROW_HEIGHT = 56;

export const HEADER_HEIGHT = 56;

export const DAYS = Array.from({ length: 7 });

export const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}:00`,
);

/**
 * The schedule bar's height, as the list toolbar measures: a row of 32px
 * controls (40px on touch layouts) with its insets and hairline.
 */
export const SCHEDULE_BAR_HEIGHT = 49;
