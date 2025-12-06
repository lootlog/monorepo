import type { Reservation } from "@/hooks/api/reservations/use-reservations";

export type ReservationSegment = {
  reservation: Reservation;
  id: string;
  dayIdx: number;
  startHour: number;
  durationHours: number;
  segmentStart: Date;
  segmentEnd: Date;
  isReservationStart: boolean;
};
