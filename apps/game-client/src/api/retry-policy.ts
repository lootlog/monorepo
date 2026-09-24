import type { LoggedActionRetryOptions } from "@/lib/logs/log-actions";
import { GAME_API_REQUEST_TIMEOUT_MS } from "@/lib/configure-api-clients";

const GAME_EVENT_RETRYABLE_STATUSES = [
  408, 425, 429, 500, 502, 503, 504,
] as const;

export const GAME_EVENT_RETRY_OPTIONS: LoggedActionRetryOptions = {
  maxAttempts: 3,
  // Kills and automatic timers have a 30-second server deduplication window.
  // Reserve a complete request before retrying, including after tab suspension.
  budget: {
    maxElapsedMs: 25_000,
    attemptTimeoutMs: GAME_API_REQUEST_TIMEOUT_MS,
  },
  retryableStatuses: GAME_EVENT_RETRYABLE_STATUSES,
  getDelayMs: (attempt) => {
    if (attempt <= 1) {
      return 250;
    }

    return 750;
  },
};
