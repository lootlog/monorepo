import type { ReservationWindowResponseDtoItemsItem } from "@lootlog/client/main";

export type NormalizedReservation = Omit<
  ReservationWindowResponseDtoItemsItem,
  "startsAt" | "endsAt" | "createdAt"
> & {
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
};

export const normalizeReservation = (
  reservation: ReservationWindowResponseDtoItemsItem,
): NormalizedReservation => ({
  ...reservation,
  startsAt: new Date(reservation.startsAt),
  endsAt: new Date(reservation.endsAt),
  createdAt: new Date(reservation.createdAt),
});
