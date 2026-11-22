import { DiscordAPIError, HTTPError, RateLimitError } from "discord.js";

const NON_RETRYABLE_DISCORD_ERROR_CODES: ReadonlySet<number> = new Set([
  10_003, 10_004, 10_013, 50_001, 50_007, 50_013, 50_035,
]);

const neverConnectedNetworkErrors = ["ECONNREFUSED", "EAI_AGAIN"];

const transientNetworkErrors = [
  "ETIMEDOUT",
  "ECONNRESET",
  ...neverConnectedNetworkErrors,
  "fetch failed",
];

export const isPermanentDiscordError = (cause: unknown): boolean =>
  cause instanceof DiscordAPIError &&
  cause.status < 500 &&
  NON_RETRYABLE_DISCORD_ERROR_CODES.has(Number(cause.code));

export const isRetryableDiscordError = (cause: unknown): boolean => {
  if (cause instanceof DiscordAPIError) {
    return cause.status >= 500 || isRateLimit(cause);
  }

  if (cause instanceof RateLimitError || cause instanceof HTTPError)
    return true;

  return (
    cause instanceof Error &&
    (cause.name === "AbortError" ||
      transientNetworkErrors.some((fragment) =>
        cause.message.includes(fragment),
      ))
  );
};

const isRateLimit = (cause: unknown) =>
  cause instanceof RateLimitError ||
  (cause instanceof DiscordAPIError && cause.status === 429);

export const isRetryableDiscordSendError = (cause: unknown): boolean =>
  isRateLimit(cause) ||
  (cause instanceof Error &&
    neverConnectedNetworkErrors.some((fragment) =>
      cause.message.includes(fragment),
    ));

export const discordErrorCode = (cause: unknown): string => {
  if (cause instanceof DiscordAPIError) return String(cause.code);

  if (cause instanceof RateLimitError) return "RATE_LIMITED";

  if (cause instanceof HTTPError) return `HTTP_${cause.status}`;

  return cause instanceof Error ? cause.name : "UNKNOWN_DISCORD_ERROR";
};
