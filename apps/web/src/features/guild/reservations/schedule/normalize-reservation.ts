import type { ReservationResponseDto } from "@lootlog/api-client/models/main/reservation-response-dto";

export type NormalizedReservation = Omit<
  ReservationResponseDto,
  "createdDate" | "fromDate" | "toDate"
> & {
  createdDate: Date;
  fromDate: Date;
  toDate: Date;
};

export const normalizeReservation = (
  reservation: ReservationResponseDto,
): NormalizedReservation => ({
  ...reservation,
  createdDate: new Date(reservation.createdDate),
  fromDate: new Date(reservation.fromDate),
  toDate: new Date(reservation.toDate),
  comment: reservation.comment ?? null,
});
