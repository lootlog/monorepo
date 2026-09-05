import { boundedHttpGet } from "@lootlog/instrumentation/bounded-http-get";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import type { RedisService } from "#src/redis/redis.service";

const cacheKey = "maps:all";
const cacheTtlSeconds = 60 * 60;

export class MapsOperationFailure extends TaggedErrorClass<MapsOperationFailure>()(
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
const GameMapsJson = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ id: Schema.Number, name: Schema.String })),
);
const decodeGameMapsJson = Schema.decodeUnknownSync(GameMapsJson);

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
    return yield* boundedHttpGet({
      client: options.httpClient,
      url: options.url,
      timeoutMilliseconds: 3000,
      retries: 2,
      operationId: "MapsController_getMaps.fetch",
      adapter: "maps-catalog",
      response: "successful",
      failure: (reason, retryable, status) =>
        failure(reason, { retryable, status }),
      decode: (body) => decodeGameMapsJson(new TextDecoder().decode(body)),
    });
  });

  return Effect.fn("MapsController_getMaps")(function* () {
    const cached = yield* Effect.tryPromise({
      try: () => options.redis.get(cacheKey),
      catch: () => failure("cache"),
    });
    if (cached) {
      return yield* Effect.try({
        try: () => decodeGameMapsJson(cached),
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
