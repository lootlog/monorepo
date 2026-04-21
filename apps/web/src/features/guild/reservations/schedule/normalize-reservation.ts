import type { ReservationResponseDtoOutput } from "@/lib/api/generated/main/model";

export type NormalizedReservation = Omit<
  ReservationResponseDtoOutput,
  "createdDate" | "fromDate" | "toDate"
> & {
  createdDate: Date;
  fromDate: Date;
  toDate: Date;
};

export const normalizeReservation = (
  reservation: ReservationResponseDtoOutput,
): NormalizedReservation => ({
  ...reservation,
  createdDate: new Date(reservation.createdDate),
  fromDate: new Date(reservation.fromDate),
  toDate: new Date(reservation.toDate),
  comment: reservation.comment ?? null,
});
