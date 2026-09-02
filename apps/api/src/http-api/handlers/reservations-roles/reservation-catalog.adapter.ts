import { Effect } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import {
  parseReservationCatalogPayload,
  type ReservationSpot,
} from "#src/reservations/reservation-catalog";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import { NotFoundException } from "#src/shared/http/http-errors";

const CACHE_KEY = "reservations:catalog:v2";
const CACHE_TTL_SECONDS = 60 * 60;

export interface ReservationCatalogCache {
  readonly getJson: <A>(key: string) => Effect.Effect<A | null, unknown>;
  readonly setJson: (
    key: string,
    value: unknown,
    ttl: number,
  ) => Effect.Effect<unknown, unknown>;
}

export interface ReservationCatalogAdapter {
  readonly getSpots: Effect.Effect<ReadonlyArray<ReservationSpot>, unknown>;
  readonly getSpot: (spotId: string) => Effect.Effect<ReservationSpot, unknown>;
}

export const makeReservationCatalogAdapter = (options: {
  readonly cache: ReservationCatalogCache;
  readonly httpClient: HttpClientValue;
  readonly url: string;
}): ReservationCatalogAdapter => {
  const getSpots = Effect.suspend(() =>
    options.cache.getJson<unknown>(CACHE_KEY).pipe(
      Effect.catch(() => Effect.succeed(null)),
      Effect.flatMap((cached) => {
        if (cached !== null) {
          return Effect.try({
            try: () => parseReservationCatalogPayload(cached),
            catch: (error) => error,
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
                      JSON.parse(
                        new TextDecoder().decode(response.body),
                      ) as unknown,
                    ),
                  catch: (error) => error,
                })
              : Effect.fail(
                  new Error(
                    `Reservation catalog request failed: ${response.status}`,
                  ),
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
                new NotFoundException({ code: "RESERVATION_SPOT_NOT_FOUND" }),
              );
        }),
      ),
  };
};
