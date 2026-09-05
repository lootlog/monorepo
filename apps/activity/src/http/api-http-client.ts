import { boundedHttpGet } from "@lootlog/instrumentation/bounded-http-get";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpClient } from "effect/unstable/http";

export class ApiHttpClientFailure extends TaggedErrorClass<ApiHttpClientFailure>()(
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
        return yield* boundedHttpGet({
          client: httpClient,
          url,
          timeoutMilliseconds: 3000,
          retries: 2,
          operationId,
          adapter: "api-http-client",
          response: "raw",
          failure: (reason, retryable, status) =>
            failure(
              operationId,
              reason === "status" ? "invalid-response" : reason,
              { retryable, status },
            ),
          decode: (body, status) => ({ status, body: new Uint8Array(body) }),
        });
      });
      return ApiHttpClient.of({ get });
    }),
  );
}
