export const LABEL_COLUMN_WIDTH = 50;

export const MIN_ROW_HEIGHT = 56;

export const HEADER_HEIGHT = 56;

export const DAYS = Array.from({ length: 7 });

export const HOURS = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}:00`,
);

export const SCHEDULE_BAR_HEIGHT = "calc(3rem + 1px)";

export const SCHEDULE_HOUR_LABEL_CLASS =
  "pt-1 pr-2 text-right text-2xs leading-none tabular-nums text-muted-foreground";

export const SCHEDULE_PAST_CLASS = "bg-muted/40";

export const SCHEDULE_HALF_HOUR_RULE_CLASS =
  "after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-dashed after:border-border/60";
