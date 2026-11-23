import type { TimerPhase } from "@lootlog/domain/timers";

export const TIMER_PHASE_TEXT_CLASS = {
  entrance: "text-emerald-300",
  waiting: "text-foreground",
  window: "text-orange-300",
  overdue: "text-red-400",
  expired: "text-red-400/70",
} satisfies Record<TimerPhase, string>;
