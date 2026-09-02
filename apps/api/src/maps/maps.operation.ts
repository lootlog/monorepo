import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { RedisService } from "#src/redis/redis.service";

const cacheKey = "maps:all";
const cacheTtlSeconds = 60 * 60;
const responseLimitBytes = 1024 * 1024;

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MapsOperationFailure extends Schema.TaggedError<MapsOperationFailure>()(
  "MapsOperationFailure",
  {
    reason: Schema.Literals([
      "cache",
      "invalid-response",
      "response-too-large",
      "status",
      "timeout",
      "transport",
    ]),
    retryable: Schema.Boolean,
    status: Schema.optional(Schema.Number),
  },
) {}

interface GameMap {
  readonly id: number;
  readonly name: string;
}

export interface MapsOperationOptions {
  readonly httpClient: HttpClientValue;
  readonly redis: RedisService;
  readonly url: URL;
}

const failure = (
  reason: MapsOperationFailure["reason"],
  options?: { readonly retryable?: boolean; readonly status?: number },
) =>
  new MapsOperationFailure({
    reason,
    retryable: options?.retryable ?? false,
    status: options?.status,
  });

export const makeMapsOperation = (options: MapsOperationOptions) => {
  const fetchMaps = Effect.fn("MapsController_getMaps.fetch")(function* () {
    let retryCount = 0;
    const request = Effect.suspend(() => {
      const currentRetryCount = retryCount;
      retryCount += 1;
      return options.httpClient.get(options.url.toString()).pipe(
        Effect.timeout("3 seconds"),
        Effect.mapError((error) =>
          failure(error._tag === "TimeoutError" ? "timeout" : "transport", {
            retryable: true,
          }),
        ),
        Effect.flatMap((response) => {
          if (response.status < 200 || response.status >= 300) {
            return Effect.fail(
              failure("status", {
                retryable: response.status >= 500,
                status: response.status,
              }),
            );
          }
          return response.arrayBuffer.pipe(
            Effect.mapError(() => failure("invalid-response")),
            Effect.flatMap((body) =>
              body.byteLength <= responseLimitBytes
                ? Effect.succeed(body)
                : Effect.fail(failure("response-too-large")),
            ),
          );
        }),
        Effect.flatMap((body) =>
          Effect.try({
            try: () => JSON.parse(new TextDecoder().decode(body)) as GameMap[],
            catch: () => failure("invalid-response"),
          }),
        ),
        Effect.withSpan("MapsController_getMaps.fetch.attempt", {
          attributes: {
            adapter: "maps-catalog",
            retryCount: currentRetryCount,
          },
        }),
      );
    });
    return yield* request.pipe(
      Effect.retry({ times: 2, while: (error) => error.retryable }),
    );
  });

  return Effect.fn("MapsController_getMaps")(function* () {
    const cached = yield* Effect.tryPromise({
      try: () => options.redis.get(cacheKey),
      catch: () => failure("cache"),
    });
    if (cached) {
      return yield* Effect.try({
        try: () => JSON.parse(cached) as GameMap[],
        catch: () => failure("cache"),
      });
    }

    const maps = yield* fetchMaps();
    yield* Effect.tryPromise({
      try: () =>
        options.redis.set(cacheKey, JSON.stringify(maps), cacheTtlSeconds),
      catch: () => failure("cache"),
    });
    return maps;
  })().pipe(
    Effect.catch((error) =>
      Effect.logError("Failed to fetch maps").pipe(
        Effect.annotateLogs({ reason: error.reason }),
        Effect.as([] as GameMap[]),
      ),
    ),
    Effect.withSpan("MapsController_getMaps", {
      attributes: { adapter: "maps-catalog", retryCount: 0 },
    }),
  );
};
