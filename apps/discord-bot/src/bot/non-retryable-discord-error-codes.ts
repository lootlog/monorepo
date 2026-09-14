import { DiscordAPIError, HTTPError, RateLimitError } from "discord.js";

/**
 * Discord JSON error codes that describe a permanent condition for the given
 * target: retrying the same request cannot succeed until a person changes
 * something in Discord.
 *
 * 10003 Unknown channel, 10004 Unknown guild, 10013 Unknown user,
 * 50001 Missing access, 50007 Cannot send messages to this user,
 * 50013 Missing permissions, 50035 Invalid form body.
 */
export const NON_RETRYABLE_DISCORD_ERROR_CODES: ReadonlySet<number> = new Set([
  10_003, 10_004, 10_013, 50_001, 50_007, 50_013, 50_035,
]);

const transientNetworkErrors = [
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "fetch failed",
];

/**
 * Whether Discord reported a condition that repeating the same request cannot
 * change. Idempotent reads retry everything else.
 */
export const isPermanentDiscordError = (cause: unknown): boolean =>
  cause instanceof DiscordAPIError &&
  cause.status < 500 &&
  NON_RETRYABLE_DISCORD_ERROR_CODES.has(Number(cause.code));

/**
 * Whether a failed Discord mutation is known to be safe and worthwhile to
 * repeat: rate limits, Discord 5xx responses and network failures before a
 * response. Unknown errors are not retried because the request may have
 * reached Discord.
 */
export const isRetryableDiscordError = (cause: unknown): boolean => {
  if (cause instanceof DiscordAPIError) {
    return cause.status >= 500 || cause.status === 429;
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

/**
 * A stable, token-free code describing a Discord SDK failure.
 */
export const discordErrorCode = (cause: unknown): string => {
  if (cause instanceof DiscordAPIError) return String(cause.code);

  if (cause instanceof RateLimitError) return "RATE_LIMITED";

  if (cause instanceof HTTPError) return `HTTP_${cause.status}`;

  return cause instanceof Error ? cause.name : "UNKNOWN_DISCORD_ERROR";
};
