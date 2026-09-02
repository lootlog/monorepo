import { Effect, Schema } from "effect";
import { HttpBody } from "effect/unstable/http";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";

export type OutboundHttpMethod = "GET" | "POST";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class OutboundHttpFailure extends Schema.TaggedError<OutboundHttpFailure>()(
  "OutboundHttpFailure",
  {
    reason: Schema.Literals(["response-too-large", "timeout", "transport"]),
    retryable: Schema.Boolean,
  },
) {}

export interface OutboundHttpRequest {
  readonly adapter: string;
  readonly body?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method: OutboundHttpMethod;
  readonly responseLimitBytes: number;
  readonly retryTimes: number;
  readonly timeout: `${number} millis` | `${number} seconds`;
  readonly url: string | URL;
}

export interface OutboundHttpResponse {
  readonly body: ArrayBuffer;
  readonly headers: Readonly<Record<string, string>>;
  readonly status: number;
}

export const outboundHttpRequest = (
  httpClient: HttpClientValue,
  request: OutboundHttpRequest,
): Effect.Effect<OutboundHttpResponse, OutboundHttpFailure> => {
  let retryCount = 0;
  const attempt = Effect.suspend(() => {
    const currentRetryCount = retryCount;
    retryCount += 1;
    const execute =
      request.method === "GET"
        ? httpClient.get(request.url.toString(), { headers: request.headers })
        : httpClient.post(request.url.toString(), {
            body:
              request.body === undefined
                ? undefined
                : HttpBody.text(
                    request.body,
                    request.headers?.["content-type"],
                  ),
            headers: request.headers,
          });
    return execute.pipe(
      Effect.timeout(request.timeout),
      Effect.mapError(
        (error) =>
          new OutboundHttpFailure({
            reason: error._tag === "TimeoutError" ? "timeout" : "transport",
            retryable: request.method === "GET",
          }),
      ),
      Effect.flatMap((response) =>
        response.arrayBuffer.pipe(
          Effect.mapError(
            () =>
              new OutboundHttpFailure({
                reason: "transport",
                retryable: request.method === "GET",
              }),
          ),
          Effect.flatMap((body) =>
            body.byteLength <= request.responseLimitBytes
              ? Effect.succeed({
                  body,
                  headers: response.headers,
                  status: response.status,
                })
              : Effect.fail(
                  new OutboundHttpFailure({
                    reason: "response-too-large",
                    retryable: false,
                  }),
                ),
          ),
        ),
      ),
      Effect.withSpan("OutboundHttp_request.attempt", {
        attributes: { adapter: request.adapter, retryCount: currentRetryCount },
      }),
    );
  });
  return attempt.pipe(
    Effect.retry({
      times: request.retryTimes,
      while: (error) => error.retryable,
    }),
  );
};
