export const LABEL_COLUMN_WIDTH = 50;
export const MIN_ROW_HEIGHT = 56;
export const HEADER_HEIGHT = 56;

export const DAYS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

export const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}:00`,
);

export const MONTH_NAMES = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
] as const;
