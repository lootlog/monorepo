import { Effect } from "effect";
import type { HttpClient } from "effect/unstable/http/HttpClient";

type FailureReason =
  | "invalid-response"
  | "response-too-large"
  | "status"
  | "timeout"
  | "transport";

/** Request policies remain explicit: raw callers own status interpretation. */
export const boundedHttpGet = Effect.fnUntraced(function* <
  A,
  E extends { readonly retryable: boolean },
>(options: {
  client: HttpClient;
  url: URL | string;
  timeoutMilliseconds: number;
  retries: number;
  operationId: string;
  adapter: string;
  response: "successful" | "raw";
  failure: (reason: FailureReason, retryable: boolean, status?: number) => E;
  decode: (body: ArrayBuffer, status: number) => A;
}) {
  let retryCount = 0;
  const attempt = Effect.suspend(() => {
    const currentRetryCount = retryCount++;
    return options.client.get(String(options.url)).pipe(
      Effect.timeout(options.timeoutMilliseconds),
      Effect.mapError((error) =>
        options.failure(
          error._tag === "TimeoutError" ? "timeout" : "transport",
          true,
        ),
      ),
      Effect.flatMap((response) => {
        if (
          options.response === "successful" &&
          (response.status < 200 || response.status >= 300)
        ) {
          return Effect.fail(
            options.failure("status", response.status >= 500, response.status),
          );
        }
        const status = options.response === "raw" ? response.status : undefined;
        return response.arrayBuffer.pipe(
          Effect.mapError(() =>
            options.failure(
              "invalid-response",
              options.response === "raw" && response.status >= 500,
              status,
            ),
          ),
          Effect.flatMap((body) =>
            body.byteLength <= 1024 * 1024
              ? Effect.try({
                  try: () => options.decode(body, response.status),
                  catch: () => options.failure("invalid-response", false),
                })
              : Effect.fail(
                  options.failure("response-too-large", false, status),
                ),
          ),
        );
      }),
      Effect.withSpan(`${options.operationId}.attempt`, {
        attributes: { adapter: options.adapter, retryCount: currentRetryCount },
      }),
    );
  });
  return yield* attempt.pipe(
    Effect.retry({ times: options.retries, while: (error) => error.retryable }),
  );
});
