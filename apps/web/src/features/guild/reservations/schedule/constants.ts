export const LABEL_COLUMN_WIDTH = 50;
export const MIN_ROW_HEIGHT = 56;
export const HEADER_HEIGHT = 56;

export const DAYS = Array.from({ length: 7 });

export const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}:00`,
);
