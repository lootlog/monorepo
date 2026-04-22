import { reservationSlug } from "./reservation-slug";
import {
  getReservationsControllerGetReservationsCardsQueryKey,
  getReservationsControllerGetReservationsCardsQueryOptions,
  getReservationsControllerGetReservationsQueryKey,
  getReservationsControllerGetReservationsQueryOptions,
} from "@/lib/api/generated/main/reservations/reservations";
import type {
  ReservationResponseDto,
  ReservationsResponseDto,
} from "@/lib/api/generated/main/model";

export const mapReservationsByAlias = (
  reservationsByKey: ReservationsResponseDto | undefined,
): Record<string, ReservationResponseDto[]> => {
  const reservationBuckets = new Map<
    string,
    {
      reservations: ReservationResponseDto[];
      reservationIds: Set<number>;
    }
  >();
  const reservationsByAlias: Record<string, ReservationResponseDto[]> =
    Object.create(null);

  for (const [rawKey, reservations] of Object.entries(
    reservationsByKey ?? {},
  )) {
    const slugKey = reservationSlug(rawKey);
    const lowercaseKey = rawKey.toLowerCase();
    const primaryKey = slugKey || lowercaseKey || rawKey;
    const aliases = [
      ...new Set([primaryKey, rawKey, lowercaseKey, slugKey].filter(Boolean)),
    ];

    const reservationBucket = reservationBuckets.get(primaryKey) ?? {
      reservations: [],
      reservationIds: new Set<number>(),
    };
    reservationBuckets.set(primaryKey, reservationBucket);

    for (const reservation of reservations ?? []) {
      if (reservationBucket.reservationIds.has(reservation.id)) {
        continue;
      }

      reservationBucket.reservationIds.add(reservation.id);
      reservationBucket.reservations.push(reservation);
    }

    for (const alias of aliases) {
      reservationsByAlias[alias] = reservationBucket.reservations;
    }
  }

  for (const bucket of reservationBuckets.values()) {
    bucket.reservations.sort(
      (leftReservation, rightReservation) =>
        new Date(leftReservation.fromDate).getTime() -
        new Date(rightReservation.fromDate).getTime(),
    );
  }

  return reservationsByAlias;
};

export const reservationsQueryOptions = (guildId: string) =>
  getReservationsControllerGetReservationsQueryOptions(
    { guildId },
    {
      query: {
        queryKey: getReservationsControllerGetReservationsQueryKey({
          guildId,
        }),
        select: mapReservationsByAlias,
        staleTime: 30_000,
      },
    },
  );

export const reservationsCardsQueryOptions = (guildId: string) =>
  getReservationsControllerGetReservationsCardsQueryOptions(
    { guildId },
    {
      query: {
        queryKey: getReservationsControllerGetReservationsCardsQueryKey({
          guildId,
        }),
        staleTime: 30_000,
      },
    },
  );
