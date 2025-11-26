import { useQuery, queryOptions } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import { reservationSlug } from "@/features/reservations/reservation-slug";

export interface Reservation {
  id: number;
  reservationId: string;
  createdDate: Date;
  fromDate: Date;
  toDate: Date;
  createdBy: string;
  comment?: string | null;
}

export const reservationsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["reservations", guildId],
    queryFn: async () => {
      const response = await apiClient.get<Record<string, Reservation[]>>(
        `/guilds/${guildId}/reservations`,
      );
      const data = response.data ?? {};

      const aggregated = new Map<
        string,
        { list: Reservation[]; ids: Set<number> }
      >();
      const aliases = new Map<string, Reservation[]>();

      const registerAlias = (alias: string, list: Reservation[]) => {
        aliases.set(alias, list);
      };

      Object.entries(data).forEach(([rawKey, reservations]) => {
        const normalizedList = (reservations ?? []).map((reservation) => ({
          ...reservation,
          id: reservation.id,
          fromDate: new Date(reservation.fromDate),
          toDate: new Date(reservation.toDate),
          createdDate: new Date(reservation.createdDate),
          comment: reservation.comment ?? null,
        }));

        const slugKey = reservationSlug(rawKey);
        const lowerKey = rawKey.toLowerCase();
        const bucketKey = slugKey || lowerKey || rawKey;

        let bucket = aggregated.get(bucketKey);
        if (!bucket) {
          bucket = { list: [], ids: new Set<number>() };
          aggregated.set(bucketKey, bucket);
        }

        const { list, ids } = bucket;

        normalizedList.forEach((reservation) => {
          if (ids.has(reservation.id)) {
            return;
          }
          ids.add(reservation.id);
          list.push(reservation);
        });

        registerAlias(bucketKey, list);
        registerAlias(rawKey, list);
        registerAlias(lowerKey, list);
        if (slugKey) {
          registerAlias(slugKey, list);
        }
      });

      for (const { list } of aggregated.values()) {
        list.sort((a, b) => a.fromDate.getTime() - b.fromDate.getTime());
      }

      const mappedEntries: Record<string, Reservation[]> = Object.create(null);
      aliases.forEach((list, alias) => {
        mappedEntries[alias] = list;
      });

      return mappedEntries;
    },
    enabled: !!guildId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    meta: { persist: false },
  });

export const useReservations = () => {
  const guildId = useGuildId();

  const query = useQuery({
    ...reservationsQueryOptions(guildId ?? ""),
  });

  return query;
};
