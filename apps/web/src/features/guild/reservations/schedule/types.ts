import type { NormalizedReservation } from "./normalize-reservation";

export type ReservationSegment = {
  reservation: NormalizedReservation;
  id: string;
  dayIdx: number;
  startHour: number;
  durationHours: number;
  segmentStart: Date;
  segmentEnd: Date;
  isReservationStart: boolean;
};
