import type { TimerPhase } from "@lootlog/domain/timers";

export const TIMER_PHASE_TEXT_CLASS = {
  entrance: "text-signal-ready",
  waiting: "text-foreground",
  window: "text-signal-timer",
  overdue: "text-signal-alert",
  expired: "text-signal-alert/70",
} satisfies Record<TimerPhase, string>;
