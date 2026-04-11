import { useQuery, queryOptions } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import { reservationSlug } from "@/features/guild/reservations/reservation-slug";
import { queryKeys } from "@/lib/query-keys";

export interface ApiReservation {
  id: number;
  reservationId: string;
  createdDate: string;
  fromDate: string;
  toDate: string;
  createdBy: string;
  comment?: string | null;
}

export interface Reservation {
  id: number;
  reservationId: string;
  createdDate: Date;
  fromDate: Date;
  toDate: Date;
  createdBy: string;
  comment?: string | null;
}

type ReservationBucket = {
  reservations: Reservation[];
  reservationIds: Set<number>;
};

const normalizeReservation = (reservation: ApiReservation): Reservation => ({
  ...reservation,
  fromDate: new Date(reservation.fromDate),
  toDate: new Date(reservation.toDate),
  createdDate: new Date(reservation.createdDate),
  comment: reservation.comment ?? null,
});

const getReservationAliases = (rawKey: string) => {
  const slugKey = reservationSlug(rawKey);
  const lowercaseKey = rawKey.toLowerCase();
  const primaryKey = slugKey || lowercaseKey || rawKey;

  return [
    ...new Set([primaryKey, rawKey, lowercaseKey, slugKey].filter(Boolean)),
  ];
};

const getOrCreateReservationBucket = (
  buckets: Map<string, ReservationBucket>,
  key: string,
): ReservationBucket => {
  const existingBucket = buckets.get(key);
  if (existingBucket) {
    return existingBucket;
  }

  const newBucket = { reservations: [], reservationIds: new Set<number>() };
  buckets.set(key, newBucket);
  return newBucket;
};

const addReservationIfMissing = (
  bucket: ReservationBucket,
  reservation: Reservation,
) => {
  if (bucket.reservationIds.has(reservation.id)) {
    return;
  }

  bucket.reservationIds.add(reservation.id);
  bucket.reservations.push(reservation);
};

const sortReservationsByStartDate = (
  leftReservation: Reservation,
  rightReservation: Reservation,
) => leftReservation.fromDate.getTime() - rightReservation.fromDate.getTime();

export const mapReservationsByAlias = (
  reservationsByKey: Record<string, ApiReservation[]> | undefined,
): Record<string, Reservation[]> => {
  const reservationBuckets = new Map<string, ReservationBucket>();
  const reservationsByAlias: Record<string, Reservation[]> =
    Object.create(null);

  for (const [rawKey, reservations] of Object.entries(
    reservationsByKey ?? {},
  )) {
    const aliases = getReservationAliases(rawKey);
    const primaryKey = aliases[0] ?? rawKey;
    const reservationBucket = getOrCreateReservationBucket(
      reservationBuckets,
      primaryKey,
    );

    for (const reservation of reservations ?? []) {
      addReservationIfMissing(
        reservationBucket,
        normalizeReservation(reservation),
      );
    }

    for (const alias of aliases) {
      reservationsByAlias[alias] = reservationBucket.reservations;
    }
  }

  for (const bucket of reservationBuckets.values()) {
    bucket.reservations.sort(sortReservationsByStartDate);
  }

  return reservationsByAlias;
};

export const reservationsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: queryKeys.reservations.all(guildId),
    queryFn: async () => {
      const response = await apiClient.get<Record<string, ApiReservation[]>>(
        `/guilds/${guildId}/reservations`,
      );

      return mapReservationsByAlias(response);
    },
    enabled: !!guildId,
    staleTime: 30_000,
    meta: { persist: false },
  });

export const useReservations = () => {
  const guildId = useGuildId();

  const query = useQuery({
    ...reservationsQueryOptions(guildId ?? ""),
  });

  return query;
};
