import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Cause, Effect, Schema } from "effect";
import { isPermanentDiscordError } from "./non-retryable-discord-error-codes.js";

export class DiscordSdkReadFailure extends TaggedErrorClass<DiscordSdkReadFailure>()(
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
          retryable: !isPermanentDiscordError(cause),
        }),
    }).pipe(
      Effect.timeout("10 seconds"),
      Effect.mapError((error) =>
        Cause.isTimeoutError(error)
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
