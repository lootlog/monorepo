import type { LoggedActionRetryOptions } from "@/lib/logs/log-actions";

const GAME_EVENT_RETRYABLE_STATUSES = [
  408, 425, 429, 500, 502, 503, 504,
] as const;

export const GAME_EVENT_RETRY_OPTIONS: LoggedActionRetryOptions = {
  maxAttempts: 3,
  retryableStatuses: GAME_EVENT_RETRYABLE_STATUSES,
  getDelayMs: (attempt) => {
    if (attempt <= 1) {
      return 250;
    }

    return 750;
  },
};

export const AUTO_TIMER_REQUEST_TIMEOUT_MS = 8_000;

export const AUTO_TIMER_RETRY_OPTIONS: LoggedActionRetryOptions = {
  ...GAME_EVENT_RETRY_OPTIONS,
  // The API deduplicates automatic timers for 30 seconds. An attempt starting
  // by 20 seconds ends by its deadline with a 2-second margin, including after
  // tab suspension.
  latestAttemptStartMs: 20_000,
};
