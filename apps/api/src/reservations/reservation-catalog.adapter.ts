import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { RedisError } from "effect/persistence/Redis";
import type { HttpClient as HttpClientValue } from "effect/http/HttpClient";
import {
  parseReservationCatalogPayload,
  type ReservationSpot,
} from "./reservation-catalog.js";
import {
  type OutboundHttpFailure,
  outboundHttpRequest,
} from "#src/shared/http/outbound-http";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import { decodeJsonUnknown } from "#src/shared/schema/json";

const CACHE_KEY = "reservations:catalog:v2";

const CACHE_TTL_SECONDS = 60 * 60;

export interface ReservationCatalogCache {
  readonly getJson: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
  ) => Effect.Effect<S["Type"] | null, RedisError>;
  readonly setJson: <Value>(
    key: string,
    value: Value,
    ttl: number,
  ) => Effect.Effect<void, RedisError>;
}

/** The catalog service answered with an error status or an unusable payload. */
export class ReservationCatalogUnavailable extends TaggedErrorClass<
  ReservationCatalogUnavailable,
  { readonly brand: unique symbol }
>()("ReservationCatalogUnavailable", {
  status: Schema.optional(Schema.Finite),
  cause: Schema.optional(Schema.Defect()),
}) {}

type CatalogFailure = ReservationCatalogUnavailable | OutboundHttpFailure;

export interface ReservationCatalogAdapter {
  readonly getSpots: Effect.Effect<
    ReadonlyArray<ReservationSpot>,
    CatalogFailure
  >;
  readonly getSpot: (
    spotId: string,
  ) => Effect.Effect<ReservationSpot, CatalogFailure | ResourceNotFoundError>;
}

export const makeReservationCatalogAdapter = (options: {
  readonly cache: ReservationCatalogCache;
  readonly httpClient: HttpClientValue;
  readonly url: string;
}): ReservationCatalogAdapter => {
  const getSpots = Effect.suspend(() =>
    options.cache.getJson(CACHE_KEY, Schema.Unknown).pipe(
      Effect.orElseSucceed(() => null),
      Effect.flatMap((cached) => {
        if (cached !== null) {
          return Effect.try({
            try: () => parseReservationCatalogPayload(cached),
            catch: (cause) => new ReservationCatalogUnavailable({ cause }),
          });
        }

        return outboundHttpRequest(options.httpClient, {
          adapter: "reservation-catalog",
          method: "GET",
          responseLimitBytes: 4 * 1024 * 1024,
          retryTimes: 2,
          timeout: "10 seconds",
          url: options.url,
        }).pipe(
          Effect.flatMap((response) =>
            response.status >= 200 && response.status < 300
              ? Effect.try({
                  try: () =>
                    parseReservationCatalogPayload(
                      decodeJsonUnknown(
                        new TextDecoder().decode(response.body),
                      ),
                    ),
                  catch: (cause) =>
                    new ReservationCatalogUnavailable({
                      status: response.status,
                      cause,
                    }),
                })
              : Effect.fail(
                  new ReservationCatalogUnavailable({
                    status: response.status,
                  }),
                ),
          ),
          Effect.tap((spots) =>
            options.cache
              .setJson(CACHE_KEY, spots, CACHE_TTL_SECONDS)
              .pipe(Effect.ignore),
          ),
        );
      }),
      Effect.withSpan("reservation-catalog.getSpots", {
        attributes: { adapter: "reservation-catalog", retryCount: 2 },
      }),
    ),
  );

  return {
    getSpots,
    getSpot: (spotId) =>
      getSpots.pipe(
        Effect.flatMap((spots) => {
          const spot = spots.find((candidate) => candidate.id === spotId);

          return spot
            ? Effect.succeed(spot)
            : Effect.fail(
                new ResourceNotFoundError({
                  code: "RESERVATION_SPOT_NOT_FOUND",
                }),
              );
        }),
      ),
  };
};
