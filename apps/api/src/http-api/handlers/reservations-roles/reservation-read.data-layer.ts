import { and, asc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  reservationShareTable,
  reservationTable,
  userPinnedReservationSpotTable,
} from "#src/database/drizzle/schema";
import { presentReservation } from "#src/reservations/reservation-presentation";
import { parseReservationWindow } from "#src/reservations/reservation-policy";
import { canModerateReservations } from "#src/reservations/reservation-viewer";
import { NotFoundException } from "#src/shared/http/http-errors";
import {
  ReservationReadData,
  ReservationsRolesOperationError,
} from "./reservations-roles.handlers.js";
import type { ReservationCatalogAdapter } from "./reservation-catalog.adapter.js";

export const makeReservationReadDataLayer = (
  catalog: ReservationCatalogAdapter,
) =>
  Layer.effect(
    ReservationReadData,
    Effect.map(ApiDatabase, (database) => {
      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError(
            (cause) => new ReservationsRolesOperationError({ cause }),
          ),
        );
      const visibleGuildIds = (guildId: string) =>
        database
          .select({
            firstGuildId: reservationShareTable.firstGuildId,
            secondGuildId: reservationShareTable.secondGuildId,
          })
          .from(reservationShareTable)
          .where(
            and(
              isNull(reservationShareTable.revokedAt),
              or(
                eq(reservationShareTable.firstGuildId, guildId),
                eq(reservationShareTable.secondGuildId, guildId),
              ),
            ),
          )
          .pipe(
            Effect.map((shares) => [
              guildId,
              ...shares.map((share) =>
                share.firstGuildId === guildId
                  ? share.secondGuildId
                  : share.firstGuildId,
              ),
            ]),
          );
      const findReservations = (
        guildIds: ReadonlyArray<string>,
        condition: Exclude<ReturnType<typeof and>, undefined>,
      ) =>
        database
          .select({ reservation: reservationTable, guild: guildTable })
          .from(reservationTable)
          .innerJoin(guildTable, eq(guildTable.id, reservationTable.guildId))
          .where(
            and(inArray(reservationTable.guildId, [...guildIds]), condition),
          )
          .orderBy(asc(reservationTable.startsAt), asc(reservationTable.id))
          .pipe(
            Effect.map((rows) =>
              rows.map(({ reservation, guild }) => ({ ...reservation, guild })),
            ),
          );
      const requireSpot = (spotId: string) =>
        Effect.flatMap(catalog.getSpots, (spots) => {
          const spot = spots.find((candidate) => candidate.id === spotId);
          return spot
            ? Effect.succeed(spot)
            : Effect.fail(
                new NotFoundException({ code: "RESERVATION_SPOT_NOT_FOUND" }),
              );
        });

      return ReservationReadData.of({
        listSpots: (context) =>
          operation(
            Effect.gen(function* () {
              const now = new Date();
              const [spots, guildIds, pinnedSpots] = yield* Effect.all([
                catalog.getSpots,
                visibleGuildIds(context.guildId),
                database
                  .select({ spotId: userPinnedReservationSpotTable.spotId })
                  .from(userPinnedReservationSpotTable)
                  .where(
                    and(
                      eq(userPinnedReservationSpotTable.userId, context.userId),
                      eq(
                        userPinnedReservationSpotTable.guildId,
                        context.guildId,
                      ),
                    ),
                  ),
              ]);
              const reservations = yield* findReservations(
                guildIds,
                gt(reservationTable.endsAt, now),
              );
              const pinnedIds = new Set(
                pinnedSpots.map(({ spotId }) => spotId),
              );
              const viewer = {
                guildId: context.guildId,
                userId: context.userId,
                discordId: context.discordId,
                canModerateCurrentGuild: canModerateReservations(context),
              };
              return spots.map((spot) => {
                const atSpot = reservations.filter(
                  (reservation) => reservation.spotId === spot.id,
                );
                const local = atSpot.filter(
                  (reservation) => reservation.guildId === context.guildId,
                );
                const current =
                  local.find(
                    (reservation) =>
                      reservation.startsAt <= now && reservation.endsAt > now,
                  ) ?? null;
                const next =
                  local.find((reservation) => reservation.startsAt > now) ??
                  null;
                return {
                  ...spot,
                  isPinned: pinnedIds.has(spot.id),
                  isAvailableNow: current === null,
                  availableUntil:
                    current === null ? (next?.startsAt ?? null) : null,
                  activeReservationCount: local.length,
                  hasPartnerReservations: atSpot.some(
                    (reservation) => reservation.guildId !== context.guildId,
                  ),
                  currentReservation: current
                    ? presentReservation(current, viewer)
                    : null,
                  nextReservation: next
                    ? presentReservation(next, viewer)
                    : null,
                };
              });
            }).pipe(
              Effect.withSpan("listReservationSpots.persistence", {
                attributes: { adapter: "ApiDatabase", retryCount: 0 },
              }),
            ),
          ),
        listWindow: (context, spotId, fromValue, toValue) =>
          operation(
            Effect.gen(function* () {
              yield* requireSpot(spotId);
              const { from, to } = yield* Effect.try({
                try: () => parseReservationWindow(fromValue, toValue),
                catch: (cause) => cause,
              });
              const guildIds = yield* visibleGuildIds(context.guildId);
              const windowCondition = and(
                eq(reservationTable.spotId, spotId),
                lt(reservationTable.startsAt, to),
                gt(reservationTable.endsAt, from),
              );
              if (!windowCondition) {
                return yield* Effect.die(
                  new Error("Reservation window condition is empty"),
                );
              }
              const reservations = yield* findReservations(
                guildIds,
                windowCondition,
              );
              const viewer = {
                guildId: context.guildId,
                userId: context.userId,
                discordId: context.discordId,
                canModerateCurrentGuild: canModerateReservations(context),
              };
              return {
                items: reservations.map((reservation) =>
                  presentReservation(reservation, viewer),
                ),
                window: { from, to },
              };
            }).pipe(
              Effect.withSpan("listSpotReservations.persistence", {
                attributes: { adapter: "ApiDatabase", retryCount: 0 },
              }),
            ),
          ),
        pinSpot: (userId, guildId, spotId) =>
          operation(
            Effect.gen(function* () {
              yield* requireSpot(spotId);
              yield* database
                .insert(userPinnedReservationSpotTable)
                .values({ userId, guildId, spotId })
                .onConflictDoNothing({
                  target: [
                    userPinnedReservationSpotTable.userId,
                    userPinnedReservationSpotTable.guildId,
                    userPinnedReservationSpotTable.spotId,
                  ],
                });
            }),
          ),
        unpinSpot: (userId, guildId, spotId) =>
          operation(
            database
              .delete(userPinnedReservationSpotTable)
              .where(
                and(
                  eq(userPinnedReservationSpotTable.userId, userId),
                  eq(userPinnedReservationSpotTable.guildId, guildId),
                  eq(userPinnedReservationSpotTable.spotId, spotId),
                ),
              )
              .pipe(Effect.asVoid),
          ),
      });
    }),
  );
