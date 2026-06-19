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
import type { QueryClient } from "@tanstack/react-query";

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

export const reservationsCacheQueryKey = (guildId: string) =>
  getReservationsControllerGetReservationsQueryKey({ guildId });

const sortReservationsByStartDate = (
  reservations: ReservationResponseDto[],
) => {
  reservations.sort(
    (leftReservation, rightReservation) =>
      new Date(leftReservation.fromDate).getTime() -
      new Date(rightReservation.fromDate).getTime(),
  );

  return reservations;
};

export type ReservationsCacheMutationContext = {
  previousReservations: ReservationsResponseDto | undefined;
  optimisticReservationId?: number;
};

export const getOptimisticReservationId = () => -Date.now();

export const getReservationsCacheSnapshot = (
  queryClient: QueryClient,
  guildId: string,
) =>
  queryClient.getQueryData<ReservationsResponseDto>(
    reservationsCacheQueryKey(guildId),
  );

export const restoreReservationsCacheSnapshot = (
  queryClient: QueryClient,
  guildId: string,
  snapshot: ReservationsResponseDto | undefined,
) => {
  queryClient.setQueryData(reservationsCacheQueryKey(guildId), snapshot);
};

export const upsertReservationInReservationsCache = (
  queryClient: QueryClient,
  guildId: string,
  reservation: ReservationResponseDto,
) => {
  queryClient.setQueryData<ReservationsResponseDto>(
    reservationsCacheQueryKey(guildId),
    (currentReservations) => {
      const nextReservations: ReservationsResponseDto = currentReservations
        ? { ...currentReservations }
        : {};
      const reservationBucket =
        nextReservations[reservation.reservationId] ?? [];
      const filteredBucket = reservationBucket.filter(
        (currentReservation) => currentReservation.id !== reservation.id,
      );

      nextReservations[reservation.reservationId] = sortReservationsByStartDate(
        [...filteredBucket, reservation],
      );

      return nextReservations;
    },
  );
};

export const replaceReservationInReservationsCache = (
  queryClient: QueryClient,
  guildId: string,
  previousReservationId: number,
  reservation: ReservationResponseDto,
) => {
  removeReservationFromReservationsCache(
    queryClient,
    guildId,
    previousReservationId,
  );
  upsertReservationInReservationsCache(queryClient, guildId, reservation);
};

export const removeReservationFromReservationsCache = (
  queryClient: QueryClient,
  guildId: string,
  reservationRecordId: number,
) => {
  queryClient.setQueryData<ReservationsResponseDto>(
    reservationsCacheQueryKey(guildId),
    (currentReservations) => {
      if (!currentReservations) {
        return currentReservations;
      }

      const nextReservations: ReservationsResponseDto = {};

      for (const [reservationId, reservations] of Object.entries(
        currentReservations,
      )) {
        nextReservations[reservationId] = reservations.filter(
          (reservation) => reservation.id !== reservationRecordId,
        );
      }

      return nextReservations;
    },
  );
};
