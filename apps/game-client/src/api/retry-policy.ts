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
