import { Context, Effect, Layer, Schema } from "effect";
import { HttpClient } from "effect/unstable/http";

const RESPONSE_LIMIT_BYTES = 1024 * 1024;

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class ApiHttpClientFailure extends Schema.TaggedError<ApiHttpClientFailure>()(
  "ApiHttpClientFailure",
  {
    operationId: Schema.String,
    reason: Schema.Literals([
      "invalid-response",
      "response-too-large",
      "timeout",
      "transport",
    ]),
    retryable: Schema.Boolean,
    status: Schema.optional(Schema.Number),
  },
) {}

export interface ApiHttpClientValue {
  readonly get: (
    operationId: string,
    url: URL | string,
  ) => Effect.Effect<
    { readonly status: number; readonly body: Uint8Array },
    ApiHttpClientFailure
  >;
}

const failure = (
  operationId: string,
  reason: ApiHttpClientFailure["reason"],
  options?: { readonly retryable?: boolean; readonly status?: number },
) =>
  new ApiHttpClientFailure({
    operationId,
    reason,
    retryable: options?.retryable ?? false,
    status: options?.status,
  });

export class ApiHttpClient extends Context.Service<
  ApiHttpClient,
  ApiHttpClientValue
>()("@lootlog/activity/ApiHttpClient") {
  static readonly layer = Layer.effect(
    ApiHttpClient,
    Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const get = Effect.fn("ApiHttpClient.get")(function* (
        operationId: string,
        url: URL | string,
      ) {
        let retryCount = 0;
        const attempt = Effect.suspend(() => {
          const currentRetryCount = retryCount;
          retryCount += 1;
          return httpClient.get(String(url)).pipe(
            Effect.timeout("3 seconds"),
            Effect.mapError((error) =>
              failure(
                operationId,
                error._tag === "TimeoutError" ? "timeout" : "transport",
                { retryable: true },
              ),
            ),
            Effect.flatMap((response) =>
              response.arrayBuffer.pipe(
                Effect.mapError(() =>
                  failure(operationId, "invalid-response", {
                    retryable: response.status >= 500,
                    status: response.status,
                  }),
                ),
                Effect.flatMap((body) =>
                  body.byteLength <= RESPONSE_LIMIT_BYTES
                    ? Effect.succeed({
                        status: response.status,
                        body: new Uint8Array(body),
                      })
                    : Effect.fail(
                        failure(operationId, "response-too-large", {
                          status: response.status,
                        }),
                      ),
                ),
              ),
            ),
            Effect.withSpan(`${operationId}.attempt`, {
              attributes: {
                adapter: "api-http-client",
                retryCount: currentRetryCount,
              },
            }),
          );
        });

        return yield* attempt.pipe(
          Effect.retry({
            times: 2,
            while: (error) => error.retryable,
          }),
        );
      });
      return ApiHttpClient.of({ get });
    }),
  );
}
