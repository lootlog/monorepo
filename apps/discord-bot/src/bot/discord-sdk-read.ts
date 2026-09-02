import { Effect, Schema } from "effect";
import { DiscordAPIError } from "discord.js";

const nonRetryableErrorCodes = new Set([
  10_003, 10_004, 10_013, 50_001, 50_013,
]);

const isRetryable = (cause: unknown) =>
  !(cause instanceof DiscordAPIError) ||
  !nonRetryableErrorCodes.has(Number(cause.code));

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class DiscordSdkReadFailure extends Schema.TaggedError<DiscordSdkReadFailure>()(
  "DiscordSdkReadFailure",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
    retryable: Schema.Boolean,
  },
) {}

export const discordSdkRead = <A>(
  operation: string,
  execute: () => Promise<A>,
): Effect.Effect<A, DiscordSdkReadFailure> => {
  let retryCount = 0;
  return Effect.suspend(() => {
    const currentRetryCount = retryCount;
    retryCount += 1;
    return Effect.tryPromise({
      try: execute,
      catch: (cause) =>
        new DiscordSdkReadFailure({
          operation,
          cause,
          retryable: isRetryable(cause),
        }),
    }).pipe(
      Effect.timeout("10 seconds"),
      Effect.mapError((error) =>
        error._tag === "TimeoutError"
          ? new DiscordSdkReadFailure({
              operation,
              cause: new Error(`${operation} timed out`),
              retryable: true,
            })
          : error,
      ),
      Effect.withSpan(`DiscordSync_${operation}.attempt`, {
        attributes: { adapter: "discord-sdk", retryCount: currentRetryCount },
      }),
    );
  }).pipe(Effect.retry({ times: 2, while: (error) => error.retryable }));
};
