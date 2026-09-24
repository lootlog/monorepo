import { Effect, Stream } from "effect";
import { withScope, type HttpClient } from "effect/unstable/http/HttpClient";

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
  const client = withScope(options.client);
  const responseLimitBytes = 1024 * 1024;
  let retryCount = 0;

  const attempt = Effect.suspend(() => {
    const currentRetryCount = retryCount++;

    return Effect.gen(function* () {
      const response = yield* client
        .get(String(options.url))
        .pipe(Effect.mapError(() => options.failure("transport", true)));

      if (
        options.response === "successful" &&
        (response.status < 200 || response.status >= 300)
      ) {
        return yield* Effect.fail(
          options.failure("status", response.status >= 500, response.status),
        );
      }

      const status = options.response === "raw" ? response.status : undefined;
      let bytes = new Uint8Array(0);
      let byteLength = 0;

      yield* response.stream.pipe(
        Stream.catchReason(
          "HttpClientError",
          "EmptyBodyError",
          () => Stream.empty,
        ),
        Stream.mapError(() =>
          options.failure(
            "invalid-response",
            options.response === "raw" && response.status >= 500,
            status,
          ),
        ),
        Stream.runForEach((chunk) =>
          Effect.suspend(() => {
            const nextByteLength = byteLength + chunk.byteLength;

            if (nextByteLength > responseLimitBytes) {
              return Effect.fail(
                options.failure("response-too-large", false, status),
              );
            }

            // Bound retained memory even when the transport yields tiny chunks.
            if (nextByteLength > bytes.byteLength) {
              const grown = new Uint8Array(
                Math.min(
                  responseLimitBytes,
                  Math.max(nextByteLength, bytes.byteLength * 2),
                ),
              );

              grown.set(bytes);
              bytes = grown;
            }

            bytes.set(chunk, byteLength);
            byteLength = nextByteLength;

            return Effect.void;
          }),
        ),
      );

      return yield* Effect.try({
        try: () =>
          options.decode(bytes.slice(0, byteLength).buffer, response.status),
        catch: () => options.failure("invalid-response", false),
      });
    }).pipe(
      Effect.scoped,
      Effect.timeoutOrElse({
        duration: options.timeoutMilliseconds,
        orElse: () => Effect.fail(options.failure("timeout", true)),
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
